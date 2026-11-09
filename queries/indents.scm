; Indent only the contents between braces. Without @end, Zed includes the
; closing brace in the indentation range and moves it one level too far right.
(block "{" @start "}" @end) @indent
(members "{" @start "}" @end) @indent
(interface_declaration "{" @start "}" @end) @indent
(external_declaration "{" @start "}" @end) @indent
(native_declaration "{" @start "}" @end) @indent
(enum_declaration "{" @start "}" @end) @indent
(concise_fields "(" @start ")" @end) @indent
(match_expression "{" @start "}" @end) @indent
