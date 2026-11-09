(comment) @comment
(doc_comment) @comment.doc
(module_comment) @comment.doc
(string) @string
(escape_sequence) @string.escape
(number) @number
(boolean) @boolean
(nil) @constant.builtin
(continue_expression) @keyword
(identifier) @variable
(type_identifier) @type
(self) @variable.special
(super) @variable.special
(parameter (identifier) @variable.parameter)
(function_declaration name: (identifier) @function)
(signature name: (identifier) @function)
(external_signature name: (identifier) @function)
(external_declaration name: (type_identifier) @namespace)
(native_declaration name: (type_identifier) @namespace)
(behavior name: (identifier) @function)
(field_declaration name: (identifier) @property)
(member_expression member: (identifier) @property)
(call_expression function: (identifier) @function)
(call_expression function: (member_expression member: (identifier) @function))
(module_declaration name: (identifier) @namespace)
(module_path (identifier) @namespace)
(bit_option (identifier) @attribute)
(enum_declaration name: (type_identifier) @type)
(enum_variant name: (type_identifier) @constant)
(enum_pattern module: (identifier) @namespace)
(enum_pattern variant: (type_identifier) @constant)
(member_expression object: (type_identifier) member: (type_identifier) @constant)
(concise_field name: (identifier) @property)
["module" "import" "as" "class" "actor" "interface" "external" "native" "enum" "from"
 "is" "with" "let" "var" "new" "be" "fn" "match" "if" "loop" "in"
 "break" "assert" "panic" "todo" "echo" "test" "skip"] @keyword
["+" "-" "*" "/" "%" "=" "+=" "-=" "*=" "==" "!=" "<" "<=" ">" ">="
 "!" "&&" "||" "&" "|" "|>" "?" "->" ".."] @operator
["(" ")" "#(" "[" "]" "{" "}" "<<" ">>"] @punctuation.bracket
["," ":" "."] @punctuation.delimiter
