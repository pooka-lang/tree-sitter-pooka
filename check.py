#!/usr/bin/env python3
"""Check editor syntax snapshots, real programs, and every Zed syntax query."""
from pathlib import Path
import subprocess
import re

HERE = Path(__file__).resolve().parent

def check(*args):
    result = subprocess.run(args, cwd=HERE, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(result.stdout + result.stderr)
    return result.stdout

print(check('tree-sitter', 'test'), end='')
source_roots = [HERE / 'test/fixtures']
files = [p for base in source_roots for p in base.rglob('*.pooka')
         if 'invalid' not in p.parts]
check('tree-sitter', 'parse', '-q', *map(str, files))
queries = sorted((HERE / 'queries').glob('*.scm'))
for query in queries:
    check('tree-sitter', 'query', str(query), str(HERE / 'test/fixtures/native.pooka'))
print(f'Parsed {len(files)} syntax fixtures; {len(queries)} queries compiled.')

# Closing delimiters must end each indentation scope at their own start. This
# catches the editor regression where a newly inserted top-level } stayed at
# body indentation even though the compiler formatter would later correct it.
fixture = HERE / 'test/fixtures/indentation.pooka'
check('tree-sitter', 'parse', '-q', str(fixture))
captures = check('tree-sitter', 'query', str(HERE / 'queries/indents.scm'), str(fixture))
ends = {(int(row), int(column)) for row, column in re.findall(r'capture: \d+ - end, start: \((\d+), (\d+)\)', captures)}
expected = {(2, 0), (4, 0), (7, 0), (10, 0), (15, 4), (17, 2), (18, 0)}
assert ends == expected, f'Incorrect indentation endpoints: {ends}'
assert captures.count('capture: indent,') == len(expected)
print('Closing-brace boundaries passed for declarations and nested blocks.')

# Private names remain whole identifiers and retain their declaration/member
# roles. A leading underscore must not become a separate wildcard token.
private_source = HERE / 'test/fixtures/private_declarations.pooka'
private_captures = check('tree-sitter', 'query', str(HERE / 'queries/highlights.scm'), str(private_source))
for kind, name in [('type', '_Readable'), ('type', '_Numbers'), ('type', '_Box'),
                   ('type', '_Counter'), ('function', '_absolute'),
                   ('function', '_get'), ('function', '_current'),
                   ('function', '_increase'), ('property', '_value'),
                   ('property', '_count')]:
    assert re.search(r'capture: \d+ - ' + kind + r',[^\n]*text: `' + name + '`', private_captures), (kind, name)
print('Private declaration/member highlighting passed.')

# Complete, supported patterns still parse; unsupported expression forms must
# produce errors without losing the following valid declaration's outline.
check('tree-sitter', 'parse', '-q', str(HERE / 'test/fixtures/patterns.pooka'))
for invalid in sorted((HERE / 'test/fixtures/invalid').glob('*.pooka')):
    result = subprocess.run(['tree-sitter', 'parse', '-q', str(invalid)], cwd=HERE, capture_output=True, text=True)
    assert result.returncode == 1, (invalid.name, result.stdout, result.stderr)
    outline = check('tree-sitter', 'query', str(HERE / 'queries/outline.scm'), str(invalid))
    assert 'text: `after_error`' in outline, (invalid.name, outline)
print('Pattern/expression distinctions and syntax-error recovery passed.')

# Native is a declaration keyword, but remains a valid module/import/local and
# function name. Check captures as well as parse success to catch lexical leaks.
native_source = HERE / 'test/fixtures/native.pooka'
check('tree-sitter', 'parse', '-q', str(native_source))
for query in [HERE / 'queries/highlights.scm']:
    captures = check('tree-sitter', 'query', str(query), str(native_source))
    assert re.search(r'capture: \d+ - namespace,[^\n]*text: `_Numbers`', captures)
    for name in ['double', 'pair', 'native']:
        assert re.search(r'capture: \d+ - function,[^\n]*text: `' + name + '`', captures), name
    keywords = re.findall(r'capture: \d+ - keyword, start: \((\d+), \d+\)[^\n]*text: `native`', captures)
    assert keywords == ['4'], keywords
outline = check('tree-sitter', 'query', str(HERE / 'queries/outline.scm'), str(native_source))
for name in ['_Numbers', 'double', 'pair', 'native', 'Adapter', 'main']:
    assert re.search(r'capture: \d+ - name,[^\n]*text: `' + name + '`', outline), name
indents = check('tree-sitter', 'query', str(HERE / 'queries/indents.scm'), str(native_source))
assert re.search(r'capture: \d+ - end, start: \(7, 0\)', indents), indents
print('Native declarations, contextual identifiers, highlighting, outline and closing-brace boundaries passed.')

# Enums and concise classes. `enum` is a keyword only where a declaration
# starts; elsewhere it stays a module, function or parameter name.
enum_source = HERE / 'test/fixtures/enums.pooka'
check('tree-sitter', 'parse', '-q', str(enum_source))
for query in [HERE / 'queries/highlights.scm']:
    captures = check('tree-sitter', 'query', str(query), str(enum_source))
    keywords = re.findall(r'capture: \d+ - keyword, start: \((\d+), \d+\)[^\n]*text: `enum`', captures)
    assert keywords == ['4'], keywords
    for name in ['Error', 'Warning']:
        assert re.search(r'capture: \d+ - constant,[^\n]*text: `' + name + '`', captures), name
    assert re.search(r'capture: \d+ - namespace,[^\n]*text: `levels`', captures)
    assert re.search(r'capture: \d+ - property,[^\n]*text: `x`', captures)
    assert re.search(r'capture: \d+ - function,[^\n]*text: `enum`', captures)
outline = check('tree-sitter', 'query', str(HERE / 'queries/outline.scm'), str(enum_source))
for name in ['Severity', 'Error', 'Warning', 'Point', 'x', 'y', 'enum', 'main']:
    assert re.search(r'capture: \d+ - name,[^\n]*text: `' + name + '`', outline), name
indents = check('tree-sitter', 'query', str(HERE / 'queries/indents.scm'), str(enum_source))
assert re.search(r'capture: \d+ - end, start: \(7, 0\)', indents), indents
print('Enums, concise classes, contextual enum, highlighting, outline and indentation passed.')

# `&` and `|` are bitwise operators in expressions; `|` between patterns is
# rejected (see test/fixtures/invalid/pattern_alternatives.pooka).
bitwise_source = HERE / 'test/fixtures/bitwise.pooka'
check('tree-sitter', 'parse', '-q', str(bitwise_source))
for query in [HERE / 'queries/highlights.scm']:
    captures = check('tree-sitter', 'query', str(query), str(bitwise_source))
    for operator in ['&', '|']:
        assert re.search(r'capture: \d+ - operator,[^\n]*text: `' + re.escape(operator) + '`', captures), operator
print('Bitwise operators and their highlighting passed.')

# The runnable comparison also verifies that shorthand punctuation and assertion
# keywords retain their highlight roles, not just a permissive parse tree.
comparison = HERE / 'test/fixtures/error_handling.pooka'
captures = check('tree-sitter', 'query', str(HERE / 'queries/highlights.scm'), str(comparison))
assert len(re.findall(r'capture: \d+ - operator,[^\n]*text: `\?`', captures)) == 2
assert re.search(r'capture: \d+ - keyword,[^\n]*text: `assert`', captures)
print('Result propagation and let-assert highlighting passed.')
