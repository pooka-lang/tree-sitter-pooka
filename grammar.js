// Editor syntax tree for Pooka. Semantic restrictions (scope, exhaustiveness,
// type compatibility) belong to the compiler/LSP, not this incremental parser.
const comma = rule => optional(seq(rule, repeat(seq(',', rule)), optional(',')));
// `&` binds more tightly than `|`, and both sit between comparison and
// arithmetic, as in the compiler (§49).
const PREC = { assignment: 1, pipe: 2, or: 3, and: 4, equality: 5,
  compare: 6, bit_or: 7, bit_and: 8, sum: 9, product: 10, unary: 11, postfix: 12 };
module.exports = grammar({
  name: 'pooka',
  extras: $ => [/\s/, $.comment, $.doc_comment, $.module_comment],
  word: $ => $.identifier,
  conflicts: $ => [],
  rules: {
    source_file: $ => seq(optional($.module_declaration), repeat(choice($.import_declaration, $._declaration))),
    module_declaration: $ => seq('module', field('name', $.identifier)),
    import_declaration: $ => seq('import', field('path', $.module_path), optional(choice(
      seq('as', field('alias', $.identifier)),
      seq('.', '{', comma($.import_item), '}')))),
    module_path: $ => seq($.identifier, repeat(seq('/', $.identifier))),
    import_item: $ => seq(choice($.identifier, $.type_identifier), optional(seq('as', choice($.identifier, $.type_identifier)))),
    _declaration: $ => choice($.function_declaration, $.class_declaration, $.actor_declaration, $.interface_declaration, $.external_declaration, $.native_declaration, $.enum_declaration, $.test_declaration),
    // `native` starts a native declaration only before a type name, so a
    // top-level function may still be called `native`, as in the compiler.
    function_declaration: $ => seq(field('name', choice($.identifier, alias('native', $.identifier), alias('enum', $.identifier))), $.parameters, optional(seq('->', field('return_type', $.type))), field('body', $.block)),
    parameters: $ => seq('(', comma($.parameter), ')'),
    parameter: $ => seq(choice($.identifier, '_'), optional(seq(':', $.type))),
    type_parameters: $ => seq('(', comma($.identifier), ')'),
    // A concise class lists its fields after its name; its body is optional.
    // `(a)` stays generic parameters: a concise field always has `: Type`.
    class_declaration: $ => choice(
      seq('class', field('name', $.type_identifier), optional($.type_parameters), optional(seq('is', $.type)), optional($.conformance), $.members),
      seq('class', field('name', $.type_identifier), $.concise_fields, optional(seq('is', $.type)), optional($.conformance), optional($.members))),
    concise_fields: $ => seq('(', $.concise_field, repeat(seq(',', $.concise_field)), optional(','), ')'),
    concise_field: $ => seq(field('name', $.identifier), ':', $.type),
    actor_declaration: $ => seq('actor', field('name', $.type_identifier), optional($.type_parameters), optional($.conformance), $.members),
    conformance: $ => seq('with', $.type, repeat(seq(',', $.type))),
    members: $ => seq('{', repeat(choice($.field_declaration, $.constructor, $.behavior, $.function_declaration)), '}'),
    field_declaration: $ => seq(choice('let', 'var'), field('name', $.identifier), optional(seq(':', $.type)), optional(seq('=', $._expression))),
    constructor: $ => seq('new', $.parameters, $.block),
    behavior: $ => seq('be', field('name', $.identifier), $.parameters, optional(seq('->', $.type)), $.block),
    interface_declaration: $ => seq('interface', field('name', $.type_identifier), optional($.type_parameters), '{', repeat($.signature), '}'),
    signature: $ => seq(field('name', $.identifier), $.parameters, optional(seq('->', $.type))),
    external_declaration: $ => seq('external', field('name', $.type_identifier), optional($.type_parameters), 'from', field('language', $.identifier), $.string, '{', repeat($.external_signature), '}'),
    external_signature: $ => seq(field('name', $.identifier), $.parameters, '->', $.type),
    // NIFs (nif.md). The component string names `native/<component>`; the
    // implementation language is not part of the syntax. Signatures are the
    // same as external ones. `native` is contextual, as in the compiler: it is
    // only a keyword where a declaration can start.
    native_declaration: $ => seq('native', field('name', $.type_identifier), 'from', field('component', $.string), '{', repeat($.external_signature), '}'),
    // Enums (§224). `enum` is contextual like `native`: a keyword only where
    // a declaration can start. Variants may be separated by commas.
    enum_declaration: $ => seq('enum', field('name', $.type_identifier), '{', repeat(seq($.enum_variant, optional(','))), '}'),
    enum_variant: $ => field('name', $.type_identifier),
    test_declaration: $ => seq('test', optional('skip'), field('name', $.string), $.block),
    type: $ => choice($.identifier, $.type_identifier, $.qualified_type, $.applied_type, $.tuple_type, $.function_type),
    qualified_type: $ => seq($.identifier, '.', $.type_identifier),
    applied_type: $ => seq(choice($.identifier, $.type_identifier, $.qualified_type), '(', comma($.type), ')'),
    tuple_type: $ => seq('#(', comma($.type), ')'),
    function_type: $ => prec.right(seq('fn', '(', comma($.type), ')', '->', $.type)),
    block: $ => seq('{', repeat(choice($.let_statement, $.assert_statement, $._expression)), '}'),
    let_statement: $ => seq('let', optional('assert'), field('pattern', $._pattern), optional(seq(':', $.type)), '=', field('value', $._expression), optional(seq('as', $._expression))),
    assert_statement: $ => seq('assert', $._expression, optional(seq('as', $._expression))),
    _expression: $ => choice($.identifier, $.type_identifier, '_', $.number, $.string, $.boolean, $.nil,
      $.self, $.super, $.block, $.list, $.tuple, $.parenthesized_expression, $.binary_expression,
      $.unary_expression, $.call_expression, $.member_expression, $.propagation_expression,
      $.function_expression, $.match_expression, $.loop_expression, $.break_expression,
      $.continue_expression, $.panic_expression, $.echo_expression, $.bit_array),
    parenthesized_expression: $ => seq('(', $._expression, ')'),
    list: $ => seq('[', comma($._expression), ']'),
    tuple: $ => seq('#(', comma($._expression), ')'),
    binary_expression: $ => choice(...[
      [PREC.assignment, ['=', '+=', '-=', '*=']], [PREC.pipe, ['|>']], [PREC.or, ['||']],
      [PREC.and, ['&&']], [PREC.equality, ['==', '!=']], [PREC.compare, ['<', '<=', '>', '>=']],
      [PREC.bit_or, ['|']], [PREC.bit_and, ['&']],
      [PREC.sum, ['+', '-']], [PREC.product, ['*', '/', '%']],
    ].map(([p, ops]) => prec.left(p, seq(field('left', $._expression), field('operator', ops.length === 1 ? ops[0] : choice(...ops)), field('right', $._expression))))),
    unary_expression: $ => prec(PREC.unary, seq(choice('!', '-'), $._expression)),
    call_expression: $ => prec.left(PREC.postfix, seq(field('function', $._expression), '(', comma($._expression), ')')),
    member_expression: $ => prec.left(PREC.postfix, seq(field('object', $._expression), '.', field('member', choice($.identifier, $.type_identifier, 'new')))),
    propagation_expression: $ => prec.left(PREC.postfix, seq($._expression, '?')),
    function_expression: $ => seq('fn', $.parameters, optional(seq('->', $.type)), $.block),
    match_expression: $ => seq('match', $._expression, '{', repeat($.match_arm), '}'),
    match_arm: $ => seq(field('pattern', $._pattern), optional(seq('if', field('guard', $._expression))), '->', field('body', $._expression)),
    loop_expression: $ => seq('loop', optional(seq($._pattern, 'in', $._expression)), $.block),
    break_expression: $ => prec.right(seq('break', optional($._expression))),
    continue_expression: _ => 'continue',
    panic_expression: $ => prec.right(seq(choice('panic', 'todo'), optional(seq('as', $._expression)))),
    echo_expression: $ => prec.right(seq('echo', $._expression)),
    bit_array: $ => seq('<<', comma($.bit_segment), '>>'),
    bit_segment: $ => seq($._expression, optional(seq(':', $.bit_option, repeat(seq('-', $.bit_option))))),
    bit_option: $ => choice($.identifier, $.number, seq($.identifier, '(', $._expression, ')')),
    // Patterns have their own syntax. List tails and constructor destructuring
    // must not make list-spread construction or numeric tuple access look valid.
    // Ordinary expressions still recover through Tree-sitter ERROR/MISSING nodes
    // while a user is typing; no compiler-only syntax is silently accepted.
    _pattern: $ => choice($.identifier, $.type_identifier, '_', $.number,
      $.string, $.boolean, $.nil, $.negative_pattern, $.list_pattern,
      $.tuple_pattern, $.constructor_pattern, $.enum_pattern, $.bit_array_pattern),
    negative_pattern: $ => seq('-', $.number),
    list_pattern: $ => seq('[', optional(choice($.list_tail,
      seq($._pattern, repeat(seq(',', $._pattern)),
        optional(seq(',', $.list_tail)), optional(',')))), ']'),
    list_tail: $ => seq('..', optional($.identifier)),
    tuple_pattern: $ => seq('#(', comma($._pattern), ')'),
    constructor_pattern: $ => seq(choice($.type_identifier, $.qualified_pattern_name),
      '(', comma($._pattern), ')'),
    // `Enum.Variant` or `module.Enum.Variant`: never followed by `(`.
    enum_pattern: $ => seq(optional(seq(field('module', $.identifier), '.')),
      field('enum', $.type_identifier), '.', field('variant', $.type_identifier)),
    qualified_pattern_name: $ => seq($.identifier, '.', $.type_identifier),
    bit_array_pattern: $ => seq('<<', comma($.bit_pattern_segment), '>>'),
    bit_pattern_segment: $ => seq($._pattern,
      optional(seq(':', $.bit_option, repeat(seq('-', $.bit_option))))),
    identifier: _ => /_*[a-z][a-zA-Z0-9_]*/,
    type_identifier: _ => /_*[A-Z][a-zA-Z0-9_]*/,
    number: _ => token(choice(/0[xX][0-9a-fA-F_]+/, /0[bB][01_]+/, /0[oO][0-7_]+/, /[0-9][0-9_]*(\.[0-9][0-9_]*)?([eE][+-]?[0-9][0-9_]*)?/)),
    string: $ => seq('"', repeat(choice($.escape_sequence, /[^"\\]+/)), '"'),
    escape_sequence: _ => token(seq('\\', choice(/[^u]/, /u\{[0-9a-fA-F]+\}/))),
    boolean: _ => choice('True', 'False'), nil: _ => 'Nil', self: _ => 'self', super: _ => 'super',
    module_comment: _ => token(seq('////', /[^\n]*/)),
    doc_comment: _ => token(seq('///', /[^\/\n][^\n]*|/)),
    comment: _ => token(seq('//', /[^\/\n][^\n]*|/)),
  },
});
