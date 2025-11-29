use serde::Deserialize;
use std::collections::HashMap;
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
    /// This is passed from the TypeScript wrapper which reads CSS and expands using core
    #[serde(default)]
    pub aliases: HashMap<String, String>,
}

/// Alias map: alias name -> expanded utilities
type AliasMap = HashMap<String, String>;

/// The main visitor that transforms className attributes
pub struct TailwindExpandVisitor {
    aliases: AliasMap,
}

impl TailwindExpandVisitor {
    pub fn new(config: Config) -> Self {
        Self { aliases: config.aliases }
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

    /// Expand a single token (handles variants like lg:ButtonMd)
    fn expand_token(&self, token: &str) -> String {
        // Check for variant prefix (e.g., lg:ButtonMd, hover:Button)
        if let Some(colon_idx) = token.find(':') {
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
                        if important {
                            format!("{}!{}", prefix, u)
                        } else {
                            format!("{}{}", prefix, u)
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
                    .map(|u| format!("!{}", u))
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
            ].into_iter().collect(),
        };

        let visitor = TailwindExpandVisitor::new(config);
        assert_eq!(visitor.expand_token("Button"), "px-4 py-2");
        assert_eq!(visitor.expand_token("lg:ButtonMd"), "lg:h-10");
    }
}
