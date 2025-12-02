use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use swc_core::{
    atoms::Atom,
    ecma::{
        ast::{JSXAttr, JSXAttrName, JSXAttrOrSpread, JSXAttrValue, JSXOpeningElement, Lit, Program, Str},
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
    /// Enable debug mode to add data-expand attribute with alias names
    /// When true: adds data-expand="Button ButtonMd" attribute
    /// When false: no data-expand attribute
    #[serde(default)]
    pub debug: bool,
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
    debug: bool,
}

impl TailwindExpandVisitor {
    pub fn new(config: Config) -> Self {
        Self {
            aliases: config.aliases,
            debug: config.debug,
        }
    }

    /// Expand a className string by replacing aliases with their utilities
    /// Returns (expanded_class_name, set_of_expanded_alias_names)
    fn expand_class_name(&self, class_name: &str) -> (String, HashSet<String>) {
        let mut result = Vec::new();
        let mut expanded_aliases = HashSet::new();

        for token in class_name.split_whitespace() {
            let (expanded, alias_name) = self.expand_token(token);
            result.push(expanded);
            if let Some(name) = alias_name {
                expanded_aliases.insert(name);
            }
        }

        (result.join(" "), expanded_aliases)
    }

    /// Expand a single token (handles variants like lg:ButtonMd, dark:hover:Button)
    /// Returns (expanded_string, Option<full_token_for_data_expand>)
    fn expand_token(&self, token: &str) -> (String, Option<String>) {
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
                let utilities: String = expanded
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

                // Return full token for data-expand (e.g., "lg:Button" not just "Button")
                return (utilities, Some(token.to_string()));
            }
        }

        // Check for important modifier (e.g., !Button)
        if token.starts_with('!') {
            let rest = &token[1..];
            if let Some(expanded) = self.aliases.get(rest) {
                let utilities: String = expanded
                    .split_whitespace()
                    .map(|u| insert_important(u))
                    .collect::<Vec<_>>()
                    .join(" ");

                // Return full token for data-expand (e.g., "!Button")
                return (utilities, Some(token.to_string()));
            }
        }

        // Check if token is a direct alias
        if let Some(expanded) = self.aliases.get(token) {
            return (expanded.clone(), Some(token.to_string()));
        }

        // Not an alias, return as-is
        (token.to_string(), None)
    }

    /// Check if an attribute is a className-like attribute
    fn is_class_attr(&self, attr: &JSXAttr) -> bool {
        if let JSXAttrName::Ident(ident) = &attr.name {
            let name = ident.sym.as_str();
            return name == "className" || name == "class" || name == "classes";
        }
        false
    }
}

impl VisitMut for TailwindExpandVisitor {
    fn visit_mut_jsx_opening_element(&mut self, element: &mut JSXOpeningElement) {
        // Visit children first
        element.visit_mut_children_with(self);

        let mut expanded_aliases: HashSet<String> = HashSet::new();

        // Find and transform className attribute
        for attr_or_spread in &mut element.attrs {
            if let JSXAttrOrSpread::JSXAttr(attr) = attr_or_spread {
                if self.is_class_attr(attr) {
                    if let Some(JSXAttrValue::Lit(Lit::Str(str_lit))) = &mut attr.value {
                        let val = str_lit.value.as_str();
                        let (expanded, aliases) = self.expand_class_name(val);
                        if expanded != val {
                            str_lit.value = Atom::from(expanded);
                            str_lit.raw = None;
                        }
                        expanded_aliases.extend(aliases);
                    }
                }
            }
        }

        // Add data-expand attribute if debug mode and aliases were expanded
        if self.debug && !expanded_aliases.is_empty() {
            let mut alias_names: Vec<_> = expanded_aliases.into_iter().collect();
            alias_names.sort();

            let data_expand_attr = JSXAttrOrSpread::JSXAttr(JSXAttr {
                span: Default::default(),
                name: JSXAttrName::Ident(swc_core::ecma::ast::IdentName {
                    span: Default::default(),
                    sym: Atom::from("data-expand"),
                }),
                value: Some(JSXAttrValue::Lit(Lit::Str(Str {
                    span: Default::default(),
                    value: Atom::from(alias_names.join(" ")),
                    raw: None,
                }))),
            });

            element.attrs.push(data_expand_attr);
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

    fn create_visitor(aliases: AliasMap, debug: bool) -> TailwindExpandVisitor {
        TailwindExpandVisitor { aliases, debug }
    }

    #[test]
    fn test_expand_token_direct_alias() {
        let mut aliases = AliasMap::new();
        aliases.insert("Button".to_string(), "px-4 py-2".to_string());

        let visitor = create_visitor(aliases, false);
        let (expanded, alias) = visitor.expand_token("Button");
        assert_eq!(expanded, "px-4 py-2");
        assert_eq!(alias, Some("Button".to_string()));
    }

    #[test]
    fn test_expand_token_with_variant() {
        let mut aliases = AliasMap::new();
        aliases.insert("ButtonMd".to_string(), "h-10 px-4".to_string());

        let visitor = create_visitor(aliases, false);
        let (expanded, token) = visitor.expand_token("lg:ButtonMd");
        assert_eq!(expanded, "lg:h-10 lg:px-4");
        // Returns full token for data-expand
        assert_eq!(token, Some("lg:ButtonMd".to_string()));
    }

    #[test]
    fn test_expand_token_with_important() {
        let mut aliases = AliasMap::new();
        aliases.insert("Button".to_string(), "px-4 py-2".to_string());

        let visitor = create_visitor(aliases, false);
        let (expanded, token) = visitor.expand_token("!Button");
        assert_eq!(expanded, "!px-4 !py-2");
        // Returns full token for data-expand
        assert_eq!(token, Some("!Button".to_string()));
    }

    #[test]
    fn test_important_with_variant_utilities() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = create_visitor(aliases, false);
        let (expanded, _) = visitor.expand_token("!ButtonMain");
        assert_eq!(expanded, "!bg-amber-500 hover:!bg-amber-600");
    }

    #[test]
    fn test_expand_class_name() {
        let mut aliases = AliasMap::new();
        aliases.insert("Button".to_string(), "px-4 py-2".to_string());
        aliases.insert("ButtonMd".to_string(), "h-10".to_string());

        let visitor = create_visitor(aliases, false);
        let (expanded, tokens) = visitor.expand_class_name("Button lg:ButtonMd text-white");
        assert_eq!(expanded, "px-4 py-2 lg:h-10 text-white");
        // Returns full tokens for data-expand
        assert!(tokens.contains("Button"));
        assert!(tokens.contains("lg:ButtonMd"));
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
            debug: false,
        };

        let visitor = TailwindExpandVisitor::new(config);
        let (expanded, _) = visitor.expand_token("Button");
        assert_eq!(expanded, "px-4 py-2");
    }

    #[test]
    fn test_variant_deduplication_same_variant() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = create_visitor(aliases, false);
        let (expanded, _) = visitor.expand_token("hover:ButtonMain");
        assert_eq!(expanded, "hover:bg-amber-500 hover:bg-amber-600");
    }

    #[test]
    fn test_variant_deduplication_dark() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonGitHub".to_string(),
            "text-slate-950 dark:text-white".to_string(),
        );

        let visitor = create_visitor(aliases, false);
        let (expanded, _) = visitor.expand_token("dark:ButtonGitHub");
        assert_eq!(expanded, "dark:text-slate-950 dark:text-white");
    }

    #[test]
    fn test_variant_deduplication_chained() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = create_visitor(aliases, false);
        let (expanded, _) = visitor.expand_token("dark:hover:ButtonMain");
        assert_eq!(expanded, "dark:hover:bg-amber-500 dark:hover:bg-amber-600");
    }

    #[test]
    fn test_variant_stacking_different_variants() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = create_visitor(aliases, false);
        let (expanded, _) = visitor.expand_token("dark:ButtonMain");
        assert_eq!(expanded, "dark:bg-amber-500 dark:hover:bg-amber-600");
    }

    #[test]
    fn test_variant_with_important_modifier() {
        let mut aliases = AliasMap::new();
        aliases.insert(
            "ButtonMain".to_string(),
            "bg-amber-500 hover:bg-amber-600".to_string(),
        );

        let visitor = create_visitor(aliases, false);
        let (expanded, _) = visitor.expand_token("hover:!ButtonMain");
        assert_eq!(expanded, "hover:!bg-amber-500 hover:!bg-amber-600");
    }

    #[test]
    fn test_debug_mode_tracks_aliases() {
        let mut aliases = AliasMap::new();
        aliases.insert("Button".to_string(), "px-4 py-2".to_string());
        aliases.insert("ButtonMd".to_string(), "h-10".to_string());

        let visitor = create_visitor(aliases, true);
        let (expanded, tracked_aliases) = visitor.expand_class_name("Button ButtonMd");
        assert_eq!(expanded, "px-4 py-2 h-10");
        assert!(tracked_aliases.contains("Button"));
        assert!(tracked_aliases.contains("ButtonMd"));
    }
}
