use serde::Deserialize;
use swc_core::{
    ecma::{
        ast::{Expr, JSXAttrValue, JSXExpr, Lit, Program, Str},
        visit::{as_folder, FoldWith, VisitMut, VisitMutWith},
    },
    plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
};
use std::collections::HashMap;

/// Plugin configuration
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    /// Path to the CSS file containing @expand definitions
    pub css_path: Option<String>,
}

/// Alias map: alias name -> expanded utilities
type AliasMap = HashMap<String, String>;

/// The main visitor that transforms className attributes
pub struct TailwindExpandVisitor {
    aliases: AliasMap,
}

impl TailwindExpandVisitor {
    pub fn new(config: Config) -> Self {
        let aliases = if let Some(css_path) = config.css_path {
            // TODO: Read and parse CSS file to extract @expand blocks
            // For now, return empty map
            extract_aliases_from_css(&css_path).unwrap_or_default()
        } else {
            HashMap::new()
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
            let expanded = self.expand_class_name(&str_lit.value);
            if expanded != str_lit.value.as_str() {
                *str_lit = Str::from(expanded);
            }
        }
    }
}

/// Extract aliases from CSS file
/// TODO: Implement proper CSS parsing
fn extract_aliases_from_css(_css_path: &str) -> Option<AliasMap> {
    // TODO: Read file and parse @expand blocks
    // This should match the logic in packages/babel/src/extractor.ts
    Some(HashMap::new())
}

#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    let config: Config = serde_json::from_str(
        &metadata
            .get_transform_plugin_config()
            .unwrap_or_default(),
    )
    .unwrap_or_default();

    program.fold_with(&mut as_folder(TailwindExpandVisitor::new(config)))
}
