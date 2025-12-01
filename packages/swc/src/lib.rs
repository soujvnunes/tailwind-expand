use serde::Deserialize;
use std::collections::{HashMap, HashSet};
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
    /// Pre-expanded aliases map (alias name -> expanded utilities)
    /// The TypeScript wrapper extracts and expands aliases from CSS at config time
    #[serde(default)]
    pub aliases: HashMap<String, String>,
}

/// Alias map: alias name -> expanded utilities
type AliasMap = HashMap<String, String>;

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
        Self {
            aliases: config.aliases,
        }
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
