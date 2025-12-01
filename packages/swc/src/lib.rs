use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::sync::Mutex;
use std::time::SystemTime;
use swc_core::{
    ecma::{
        ast::{JSXAttrValue, Lit, Program},
        visit::{visit_mut_pass, VisitMut, VisitMutWith},
    },
    plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
};

/// Plugin configuration
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    /// Path to the CSS file containing @expand definitions
    /// When provided, the plugin reads and parses the CSS file directly
    #[serde(default)]
    pub css_path: Option<String>,

    /// Pre-expanded aliases map (alias name -> expanded utilities)
    /// This is kept for backward compatibility
    #[serde(default)]
    pub aliases: HashMap<String, String>,
}

/// Alias map: alias name -> expanded utilities
type AliasMap = HashMap<String, String>;

/// Cache entry for CSS file parsing
struct CacheEntry {
    mtime: SystemTime,
    aliases: AliasMap,
}

/// Global cache for CSS file parsing with mtime-based invalidation
static CACHE: Lazy<Mutex<HashMap<String, CacheEntry>>> = Lazy::new(|| Mutex::new(HashMap::new()));

/// Regex patterns for CSS parsing
static APPLY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"@apply\s+([^;]+);").unwrap());

/// Extract aliases from CSS content using a brace-depth parser
fn extract_from_css(css: &str) -> AliasMap {
    let mut aliases = AliasMap::new();

    // Find all @expand blocks and parse them
    let mut pos = 0;
    while let Some(expand_start) = css[pos..].find("@expand") {
        let abs_start = pos + expand_start;
        let rest = &css[abs_start + 7..]; // Skip "@expand"

        // Find component name (first word after @expand)
        let name_start = rest.find(|c: char| c.is_alphanumeric()).unwrap_or(0);
        let name_end = rest[name_start..]
            .find(|c: char| !c.is_alphanumeric())
            .unwrap_or(rest.len() - name_start)
            + name_start;
        let component_name = &rest[name_start..name_end];

        // Find the opening brace
        let brace_start = match rest.find('{') {
            Some(b) => b,
            None => {
                pos = abs_start + 7;
                continue;
            }
        };

        // Parse the block content by tracking brace depth
        let block_start = abs_start + 7 + brace_start + 1;
        let block_content = extract_block_content(&css[block_start..]);

        // Parse the block to extract aliases
        parse_expand_block(component_name, &block_content, &mut aliases);

        pos = block_start + block_content.len() + 1;
    }

    // Trim leading spaces
    for value in aliases.values_mut() {
        *value = value.trim().to_string();
    }

    aliases
}

/// Extract content until matching closing brace (handles nested braces)
fn extract_block_content(css: &str) -> String {
    let mut depth = 1;
    let mut end = 0;

    for (i, c) in css.char_indices() {
        match c {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    end = i;
                    break;
                }
            }
            _ => {}
        }
    }

    css[..end].to_string()
}

/// Parse an @expand block content
fn parse_expand_block(component_name: &str, content: &str, aliases: &mut AliasMap) {
    let mut pos = 0;

    while pos < content.len() {
        let rest = &content[pos..];

        // Check for nested rule starting with &
        if let Some(amp_pos) = rest.find('&') {
            // First, extract any @apply before this &
            let before_amp = &rest[..amp_pos];
            for cap in APPLY_RE.captures_iter(before_amp) {
                let utilities = cap[1].trim();
                aliases
                    .entry(component_name.to_string())
                    .or_default()
                    .push_str(&format!(" {}", utilities));
            }

            // Parse the nested rule
            let nested_start = amp_pos;
            let nested_rest = &rest[nested_start + 1..]; // Skip &

            // Get modifier name
            let mod_end = nested_rest
                .find(|c: char| !c.is_alphanumeric())
                .unwrap_or(nested_rest.len());
            let modifier = &nested_rest[..mod_end];
            let alias_name = format!("{}{}", component_name, modifier);

            // Find the opening brace for nested rule
            if let Some(brace_pos) = nested_rest[mod_end..].find('{') {
                let nested_block_start = mod_end + brace_pos + 1;
                let nested_content = extract_block_content(&nested_rest[nested_block_start..]);

                // Extract @apply from nested content
                for cap in APPLY_RE.captures_iter(&nested_content) {
                    let utilities = cap[1].trim();
                    aliases
                        .entry(alias_name.clone())
                        .or_default()
                        .push_str(&format!(" {}", utilities));
                }

                // Move position past this nested block
                pos += nested_start + 1 + nested_block_start + nested_content.len() + 1;
            } else {
                pos += nested_start + 1;
            }
        } else {
            // No more nested rules, extract remaining @apply
            for cap in APPLY_RE.captures_iter(rest) {
                let utilities = cap[1].trim();
                aliases
                    .entry(component_name.to_string())
                    .or_default()
                    .push_str(&format!(" {}", utilities));
            }
            break;
        }
    }
}

/// Expand aliases by resolving nested references
fn expand_aliases(raw_aliases: &AliasMap) -> AliasMap {
    let mut expanded = AliasMap::new();
    let mut resolving = HashSet::new();

    fn resolve(
        alias_name: &str,
        raw_aliases: &AliasMap,
        expanded: &mut AliasMap,
        resolving: &mut HashSet<String>,
    ) -> String {
        // Already expanded
        if let Some(result) = expanded.get(alias_name) {
            return result.clone();
        }

        // Not an alias
        if !raw_aliases.contains_key(alias_name) {
            return alias_name.to_string();
        }

        // Circular dependency check
        if resolving.contains(alias_name) {
            return alias_name.to_string(); // Return as-is to avoid infinite loop
        }

        resolving.insert(alias_name.to_string());

        let utilities = &raw_aliases[alias_name];
        let tokens: Vec<&str> = utilities.split_whitespace().collect();

        let resolved_tokens: Vec<String> = tokens
            .iter()
            .map(|token| {
                // Check if token is an alias (CamelCase starting with uppercase)
                if token.chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
                    && token.chars().all(|c| c.is_alphanumeric())
                {
                    resolve(token, raw_aliases, expanded, resolving)
                } else {
                    token.to_string()
                }
            })
            .collect();

        resolving.remove(alias_name);

        let result = resolved_tokens.join(" ");
        expanded.insert(alias_name.to_string(), result.clone());
        result
    }

    for alias_name in raw_aliases.keys() {
        resolve(alias_name, raw_aliases, &mut expanded, &mut resolving);
    }

    expanded
}

/// Get aliases from CSS file with mtime-based caching
fn get_aliases_from_css(css_path: &str) -> AliasMap {
    // Get file metadata for mtime
    let metadata = match fs::metadata(css_path) {
        Ok(m) => m,
        Err(_) => return AliasMap::new(),
    };

    let mtime = match metadata.modified() {
        Ok(t) => t,
        Err(_) => return AliasMap::new(),
    };

    // Check cache
    {
        let cache = CACHE.lock().unwrap();
        if let Some(entry) = cache.get(css_path) {
            if entry.mtime == mtime {
                return entry.aliases.clone();
            }
        }
    }

    // Cache miss or stale - read and parse
    let css_content = match fs::read_to_string(css_path) {
        Ok(content) => content,
        Err(_) => return AliasMap::new(),
    };

    let raw_aliases = extract_from_css(&css_content);
    let expanded_aliases = expand_aliases(&raw_aliases);

    // Update cache
    {
        let mut cache = CACHE.lock().unwrap();
        cache.insert(
            css_path.to_string(),
            CacheEntry {
                mtime,
                aliases: expanded_aliases.clone(),
            },
        );
    }

    expanded_aliases
}

/// Insert important modifier after all variant prefixes.
/// e.g., insert_important("bg-primary") -> "!bg-primary"
/// e.g., insert_important("hover:bg-primary") -> "hover:!bg-primary"
fn insert_important(utility: &str) -> String {
    if let Some(last_colon) = utility.rfind(':') {
        format!(
            "{}!{}",
            &utility[..last_colon + 1],
            &utility[last_colon + 1..]
        )
    } else {
        format!("!{}", utility)
    }
}

/// Apply variant prefix to utility, deduplicating overlapping variants.
/// e.g., apply_variant_prefix("hover:", "hover:bg-primary") -> "hover:bg-primary"
/// e.g., apply_variant_prefix("dark:hover:", "hover:bg-primary") -> "dark:hover:bg-primary"
fn apply_variant_prefix(variant_prefix: &str, utility: &str) -> String {
    if variant_prefix.is_empty() {
        return utility.to_string();
    }

    // "dark:hover:" -> {"dark", "hover"}
    let prefix_without_colon = &variant_prefix[..variant_prefix.len() - 1];
    let prefix_variants: HashSet<&str> = prefix_without_colon.split(':').collect();

    let mut result = utility;

    loop {
        if let Some(colon_idx) = result.find(':') {
            let first_variant = &result[..colon_idx];
            if prefix_variants.contains(first_variant) {
                result = &result[colon_idx + 1..];
                continue;
            }
        }
        break;
    }

    format!("{}{}", variant_prefix, result)
}

/// The main visitor that transforms className attributes
pub struct TailwindExpandVisitor {
    aliases: AliasMap,
}

impl TailwindExpandVisitor {
    pub fn new(config: Config) -> Self {
        // If cssPath is provided, read from file; otherwise use pre-computed aliases
        let aliases = if let Some(ref css_path) = config.css_path {
            get_aliases_from_css(css_path)
        } else {
            config.aliases
        };

        Self { aliases }
    }

    /// Expand a className string by replacing aliases with their utilities
    fn expand_class_name(&self, class_name: &str) -> String {
        let mut result = Vec::new();

        for token in class_name.split_whitespace() {
            let expanded = self.expand_token(token);
            result.push(expanded);
        }

        result.join(" ")
    }

    /// Expand a single token (handles variants like lg:ButtonMd, dark:hover:Button)
    fn expand_token(&self, token: &str) -> String {
        // Check for variant prefix using last colon (e.g., dark:hover:Button -> prefix="dark:hover:", alias="Button")
        if let Some(colon_idx) = token.rfind(':') {
            let prefix = &token[..colon_idx + 1];
            let mut rest = &token[colon_idx + 1..];

            // Handle important modifier after variant (e.g., lg:!ButtonMd)
            let important = rest.starts_with('!');
            if important {
                rest = &rest[1..];
            }

            // Check if rest is an alias
            if let Some(expanded) = self.aliases.get(rest) {
                return expanded
                    .split_whitespace()
                    .map(|u| {
                        let prefixed = apply_variant_prefix(prefix, u);
                        if important {
                            insert_important(&prefixed)
                        } else {
                            prefixed
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
            }
        }

        // Check for important modifier (e.g., !Button)
        if token.starts_with('!') {
            let rest = &token[1..];
            if let Some(expanded) = self.aliases.get(rest) {
                return expanded
                    .split_whitespace()
                    .map(|u| insert_important(u))
                    .collect::<Vec<_>>()
                    .join(" ");
            }
        }

        // Check if token is a direct alias
        if let Some(expanded) = self.aliases.get(token) {
            return expanded.clone();
        }

        // Not an alias, return as-is
        token.to_string()
    }
}

impl VisitMut for TailwindExpandVisitor {
    fn visit_mut_jsx_attr_value(&mut self, value: &mut JSXAttrValue) {
        // Visit children first
        value.visit_mut_children_with(self);

        // Handle string literal className
        if let JSXAttrValue::Lit(Lit::Str(str_lit)) = value {
            let val = str_lit.value.as_str();
            let expanded = self.expand_class_name(val);
            if expanded != val {
                str_lit.value = expanded.into();
                str_lit.raw = None;
            }
        }
    }
}

#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    let config: Config = serde_json::from_str(
        &metadata
            .get_transform_plugin_config()
            .unwrap_or_default(),
    )
    .unwrap_or_default();

    program.apply(visit_mut_pass(TailwindExpandVisitor::new(config)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_from_css_simple() {
        let css = r#"
            @expand Button {
                @apply px-4 py-2;
            }
        "#;
        let aliases = extract_from_css(css);
        assert_eq!(aliases.get("Button"), Some(&"px-4 py-2".to_string()));
    }

    #[test]
    fn test_extract_from_css_nested() {
        let css = r#"
            @expand Button {
                @apply px-4 py-2;
                &Md {
                    @apply h-10;
                }
            }
        "#;
        let aliases = extract_from_css(css);
        assert_eq!(aliases.get("Button"), Some(&"px-4 py-2".to_string()));
        assert_eq!(aliases.get("ButtonMd"), Some(&"h-10".to_string()));
    }

    #[test]
    fn test_expand_aliases() {
        let mut raw = AliasMap::new();
        raw.insert("Typography".to_string(), "text-base font-normal".to_string());
        raw.insert("Button".to_string(), "Typography px-4".to_string());

        let expanded = expand_aliases(&raw);
        assert_eq!(
            expanded.get("Button"),
            Some(&"text-base font-normal px-4".to_string())
        );
    }

    #[test]
    fn test_expand_token_direct_alias() {
        let mut aliases = AliasMap::new();
        aliases.insert("Button".to_string(), "px-4 py-2".to_string());

        let visitor = TailwindExpandVisitor { aliases };
        assert_eq!(visitor.expand_token("Button"), "px-4 py-2");
    }

    #[test]
    fn test_expand_token_with_variant() {
        let mut aliases = AliasMap::new();
        aliases.insert("ButtonMd".to_string(), "h-10 px-4".to_string());

        let visitor = TailwindExpandVisitor { aliases };
        assert_eq!(visitor.expand_token("lg:ButtonMd"), "lg:h-10 lg:px-4");
    }

    #[test]
    fn test_expand_token_with_important() {
        let mut aliases = AliasMap::new();
        aliases.insert("Button".to_string(), "px-4 py-2".to_string());

        let visitor = TailwindExpandVisitor { aliases };
        assert_eq!(visitor.expand_token("!Button"), "!px-4 !py-2");
    }

    #[test]
    fn test_important_with_variant_utilities() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = TailwindExpandVisitor { aliases };
        // !ButtonMain should produce hover:!bg-amber-600, not !hover:bg-amber-600
        assert_eq!(
            visitor.expand_token("!ButtonMain"),
            "!bg-amber-500 hover:!bg-amber-600"
        );
    }

    #[test]
    fn test_expand_class_name() {
        let mut aliases = AliasMap::new();
        aliases.insert("Button".to_string(), "px-4 py-2".to_string());
        aliases.insert("ButtonMd".to_string(), "h-10".to_string());

        let visitor = TailwindExpandVisitor { aliases };
        assert_eq!(
            visitor.expand_class_name("Button lg:ButtonMd text-white"),
            "px-4 py-2 lg:h-10 text-white"
        );
    }

    #[test]
    fn test_config_with_aliases() {
        let config = Config {
            css_path: None,
            aliases: [
                ("Button".to_string(), "px-4 py-2".to_string()),
                ("ButtonMd".to_string(), "h-10".to_string()),
            ]
            .into_iter()
            .collect(),
        };

        let visitor = TailwindExpandVisitor::new(config);
        assert_eq!(visitor.expand_token("Button"), "px-4 py-2");
        assert_eq!(visitor.expand_token("lg:ButtonMd"), "lg:h-10");
    }

    #[test]
    fn test_variant_deduplication_same_variant() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = TailwindExpandVisitor { aliases };
        // hover:ButtonMain should NOT produce hover:hover:bg-amber-600
        assert_eq!(
            visitor.expand_token("hover:ButtonMain"),
            "hover:bg-amber-500 hover:bg-amber-600"
        );
    }

    #[test]
    fn test_variant_deduplication_dark() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonGitHub".to_string(),
            "text-slate-950 dark:text-white".to_string(),
        );

        let visitor = TailwindExpandVisitor { aliases };
        // dark:ButtonGitHub should NOT produce dark:dark:text-white
        assert_eq!(
            visitor.expand_token("dark:ButtonGitHub"),
            "dark:text-slate-950 dark:text-white"
        );
    }

    #[test]
    fn test_variant_deduplication_chained() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = TailwindExpandVisitor { aliases };
        // dark:hover:ButtonMain should NOT produce dark:hover:hover:bg-amber-600
        assert_eq!(
            visitor.expand_token("dark:hover:ButtonMain"),
            "dark:hover:bg-amber-500 dark:hover:bg-amber-600"
        );
    }

    #[test]
    fn test_variant_stacking_different_variants() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = TailwindExpandVisitor { aliases };
        // dark:ButtonMain should produce dark:hover:bg-amber-600 (different variants stack)
        assert_eq!(
            visitor.expand_token("dark:ButtonMain"),
            "dark:bg-amber-500 dark:hover:bg-amber-600"
        );
    }

    #[test]
    fn test_variant_with_important_modifier() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = TailwindExpandVisitor { aliases };
        // hover:!ButtonMain should insert ! after the prefix
        assert_eq!(
            visitor.expand_token("hover:!ButtonMain"),
            "hover:!bg-amber-500 hover:!bg-amber-600"
        );
    }
}
