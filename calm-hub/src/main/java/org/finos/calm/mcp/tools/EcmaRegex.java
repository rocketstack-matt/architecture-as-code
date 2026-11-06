package org.finos.calm.mcp.tools;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Checks that a JSON Schema {@code pattern} is an ECMA-262 regular expression with the {@code u} flag,
 * as Ajv in the MCP TypeScript SDK compiles it. java.util.regex accepts syntax such as {@code (?i)},
 * possessive quantifiers and {@code \A} that ECMA-262 refuses. The check is strict: it can refuse a
 * rare valid pattern, but it must never accept one that a client cannot compile. The limits keep
 * the parsers of Hub, java.util.regex and the clients well inside their stacks.
 */
final class EcmaRegex {

    static final int MAX_LENGTH = 1000;
    static final int MAX_DEPTH = 64;

    private static final String SYNTAX_CHARACTERS = "^$\\.*+?()[]{}|";
    private static final Set<String> GENERAL_CATEGORIES = Set.of("C", "Other", "Cc", "Control", "cntrl", "Cf", "Format",
            "Cn", "Unassigned", "Co", "Private_Use", "Cs", "Surrogate", "L", "Letter", "LC", "Cased_Letter", "Ll",
            "Lowercase_Letter", "Lm", "Modifier_Letter", "Lo", "Other_Letter", "Lt", "Titlecase_Letter", "Lu",
            "Uppercase_Letter", "M", "Mark", "Combining_Mark", "Mc", "Spacing_Mark", "Me", "Enclosing_Mark", "Mn",
            "Nonspacing_Mark", "N", "Number", "Nd", "Decimal_Number", "digit", "Nl", "Letter_Number", "No",
            "Other_Number", "P", "Punctuation", "punct", "Pc", "Connector_Punctuation", "Pd", "Dash_Punctuation", "Pe",
            "Close_Punctuation", "Pf", "Final_Punctuation", "Pi", "Initial_Punctuation", "Po", "Other_Punctuation", "Ps",
            "Open_Punctuation", "S", "Symbol", "Sc", "Currency_Symbol", "Sk", "Modifier_Symbol", "Sm", "Math_Symbol",
            "So", "Other_Symbol", "Z", "Separator", "Zl", "Line_Separator", "Zp", "Paragraph_Separator", "Zs",
            "Space_Separator");
    private static final Set<String> BINARY_PROPERTIES = Set.of("ASCII", "ASCII_Hex_Digit", "AHex", "Alphabetic",
            "Alpha", "Any", "Assigned", "Bidi_Control", "Bidi_C", "Bidi_Mirrored", "Bidi_M", "Case_Ignorable", "CI",
            "Cased", "Changes_When_Casefolded", "CWCF", "Changes_When_Casemapped", "CWCM", "Changes_When_Lowercased",
            "CWL", "Changes_When_NFKC_Casefolded", "CWKCF", "Changes_When_Titlecased", "CWT", "Changes_When_Uppercased",
            "CWU", "Dash", "Default_Ignorable_Code_Point", "DI", "Deprecated", "Dep", "Diacritic", "Dia", "Emoji",
            "Emoji_Component", "EComp", "Emoji_Modifier", "EMod", "Emoji_Modifier_Base", "EBase", "Emoji_Presentation",
            "EPres", "Extended_Pictographic", "ExtPict", "Extender", "Ext", "Grapheme_Base", "Gr_Base",
            "Grapheme_Extend", "Gr_Ext", "Hex_Digit", "Hex", "IDS_Binary_Operator", "IDSB", "IDS_Trinary_Operator",
            "IDST", "ID_Continue", "IDC", "ID_Start", "IDS", "Ideographic", "Ideo", "Join_Control", "Join_C",
            "Logical_Order_Exception", "LOE", "Lowercase", "Lower", "Math", "Noncharacter_Code_Point", "NChar",
            "Pattern_Syntax", "Pat_Syn", "Pattern_White_Space", "Pat_WS", "Quotation_Mark", "QMark", "Radical",
            "Regional_Indicator", "RI", "Sentence_Terminal", "STerm", "Soft_Dotted", "SD", "Terminal_Punctuation", "Term",
            "Unified_Ideograph", "UIdeo", "Uppercase", "Upper", "Variation_Selector", "VS", "White_Space", "space",
            "XID_Continue", "XIDC", "XID_Start", "XIDS");
    private static final Pattern SCRIPT_CODE = Pattern.compile("[A-Z][a-z]{3}");

    private final int[] chars;
    private int pos;
    private int groups;
    private int depth;
    private final Set<String> names = new HashSet<>();
    private final List<String> namedRefs = new ArrayList<>();
    private int maxRef;

    private EcmaRegex(String pattern) {
        chars = pattern.codePoints().toArray();
    }

    /** Null if the pattern compiles in ECMA-262 with the {@code u} flag, else the reason. */
    static String error(String pattern) {
        if (pattern.codePointCount(0, pattern.length()) > MAX_LENGTH) {
            return "it is longer than " + MAX_LENGTH + " characters";
        }
        try {
            new EcmaRegex(pattern).parse();
            return null;
        } catch (IllegalArgumentException e) {
            return e.getMessage();
        }
    }

    private void parse() {
        disjunction();
        if (!atEnd()) {
            throw fail("unmatched )");
        }
        if (maxRef > groups) {
            throw new IllegalArgumentException("the back reference \\" + maxRef + " names no group");
        }
        for (String name : namedRefs) {
            if (!names.contains(name)) {
                throw new IllegalArgumentException("the back reference \\k<" + name + "> names no group");
            }
        }
    }

    private void disjunction() {
        alternative();
        while (peek() == '|') {
            pos++;
            alternative();
        }
    }

    private void alternative() {
        while (!atEnd() && peek() != '|' && peek() != ')') {
            term();
        }
    }

    private void term() {
        int c = peek();
        if (c == '^' || c == '$') {
            pos++;
            noQuantifier();
        } else if (c == '\\' && (peek(1) == 'b' || peek(1) == 'B')) {
            pos += 2;
            noQuantifier();
        } else if (c == '(') {
            group();
        } else {
            atom();
            quantifier();
        }
    }

    private void group() {
        if (++depth > MAX_DEPTH) {
            throw fail("groups are nested more than " + MAX_DEPTH + " deep");
        }
        if (startsWith("(?=") || startsWith("(?!") || startsWith("(?<=") || startsWith("(?<!")) {
            pos += peek(2) == '<' ? 4 : 3;
            disjunction();
            expect(')');
            depth--;
            noQuantifier();
            return;
        }
        if (startsWith("(?:")) {
            pos += 3;
        } else if (startsWith("(?<")) {
            pos += 3;
            String name = groupName();
            if (!names.add(name)) {
                throw fail("the group name '" + name + "' is used twice");
            }
            groups++;
        } else if (startsWith("(?")) {
            throw fail("(? must start (?:, (?=, (?!, (?<=, (?<! or (?<name>");
        } else {
            pos++;
            groups++;
        }
        disjunction();
        expect(')');
        depth--;
        quantifier();
    }

    private void atom() {
        int c = peek();
        switch (c) {
            case '[' -> characterClass();
            case '\\' -> atomEscape();
            case '*', '+', '?', '{' -> throw fail("nothing to repeat");
            case ']', '}' -> throw fail("a lone " + (char) c + " must be escaped");
            default -> pos++;
        }
    }

    private void quantifier() {
        int c = peek();
        if (c == '*' || c == '+' || c == '?') {
            pos++;
        } else if (c == '{') {
            braces();
        } else {
            return;
        }
        if (peek() == '?') {
            pos++;
        }
        if (isQuantifier(peek())) {
            throw fail("nothing to repeat (ECMA-262 has no possessive quantifiers)");
        }
    }

    private void braces() {
        int start = pos++;
        long min = digits();
        long max = min;
        if (peek() == ',') {
            pos++;
            max = peek() == '}' ? Long.MAX_VALUE : digits();
        }
        if (peek() != '}') {
            pos = start;
            throw fail("incomplete quantifier");
        }
        pos++;
        if (min > max) {
            pos = start;
            throw fail("the numbers of the quantifier are out of order");
        }
    }

    private long digits() {
        if (!isDigit(peek())) {
            throw fail("incomplete quantifier");
        }
        long value = 0;
        while (isDigit(peek())) {
            value = Math.min(value * 10 + (next() - '0'), Integer.MAX_VALUE);
        }
        return value;
    }

    private void noQuantifier() {
        if (isQuantifier(peek())) {
            throw fail("nothing to repeat");
        }
    }

    private void atomEscape() {
        pos++;
        int c = peek();
        if (c >= '1' && c <= '9') {
            long ref = digits();
            maxRef = (int) Math.max(maxRef, ref);
        } else if (c == 'k') {
            pos++;
            expect('<');
            namedRefs.add(groupName());
        } else {
            escape(false);
        }
    }

    private void characterClass() {
        pos++;
        if (peek() == '^') {
            pos++;
        }
        while (peek() != ']') {
            if (atEnd()) {
                throw fail("unterminated character class");
            }
            if (peek() == '&' && peek(1) == '&') {
                throw fail("&& in a character class is a Java intersection, not ECMA-262");
            }
            int from = classAtom();
            if (peek() == '-' && peek(1) != ']' && peek(1) != -1) {
                pos++;
                int to = classAtom();
                if (from < 0 || to < 0) {
                    throw fail("a class range cannot use a class escape");
                }
                if (from > to) {
                    throw fail("the class range is out of order");
                }
            }
        }
        pos++;
    }

    // The code point, or -1 for a class escape such as \d.
    private int classAtom() {
        if (peek() == '\\') {
            pos++;
            return escape(true);
        }
        return next();
    }

    // After the backslash. The code point, or -1 for a class escape.
    private int escape(boolean inClass) {
        if (atEnd()) {
            throw fail("\\ at the end of the pattern");
        }
        int start = pos - 1;
        int c = next();
        switch (c) {
            case 'd', 'D', 's', 'S', 'w', 'W' -> {
                return -1;
            }
            case 'p', 'P' -> {
                property();
                return -1;
            }
            case 'f' -> {
                return '\f';
            }
            case 'n' -> {
                return '\n';
            }
            case 'r' -> {
                return '\r';
            }
            case 't' -> {
                return '\t';
            }
            case 'v' -> {
                return 0x0B;
            }
            case 'c' -> {
                int letter = next();
                if (!((letter >= 'a' && letter <= 'z') || (letter >= 'A' && letter <= 'Z'))) {
                    throw failAt(start, "\\c must be followed by a letter");
                }
                return letter % 32;
            }
            case '0' -> {
                if (isDigit(peek())) {
                    throw failAt(start, "octal escapes are not ECMA-262");
                }
                return 0;
            }
            case 'x' -> {
                return hex(2, start);
            }
            case 'u' -> {
                return unicodeEscape(start);
            }
            default -> {
                if (SYNTAX_CHARACTERS.indexOf(c) >= 0 || c == '/' || (inClass && (c == '-' || c == 'b'))) {
                    return c == 'b' ? '\b' : c;
                }
                throw failAt(start, "\\" + Character.toString(c) + " is not an ECMA-262 escape");
            }
        }
    }

    private int unicodeEscape(int start) {
        if (peek() == '{') {
            pos++;
            int value = 0;
            int count = 0;
            while (isHex(peek())) {
                value = Math.min(value * 16 + Character.digit(next(), 16), 0x110000);
                count++;
            }
            if (count == 0 || peek() != '}' || value > 0x10FFFF) {
                throw failAt(start, "invalid \\u{...} escape");
            }
            pos++;
            return value;
        }
        int value = hex(4, start);
        if (Character.isHighSurrogate((char) value) && startsWith("\\u")) {
            int mark = pos;
            pos += 2;
            int low = isHex(peek()) ? hex(4, start) : -1;
            if (Character.isLowSurrogate((char) low)) {
                return Character.toCodePoint((char) value, (char) low);
            }
            pos = mark;
        }
        return value;
    }

    private int hex(int length, int start) {
        int value = 0;
        for (int i = 0; i < length; i++) {
            if (!isHex(peek())) {
                throw failAt(start, "invalid hexadecimal escape");
            }
            value = value * 16 + Character.digit(next(), 16);
        }
        return value;
    }

    private void property() {
        int start = pos - 2;
        if (peek() != '{') {
            throw failAt(start, "\\p and \\P must be followed by {");
        }
        pos++;
        StringBuilder sb = new StringBuilder();
        while (!atEnd() && peek() != '}') {
            sb.appendCodePoint(next());
        }
        if (atEnd()) {
            throw failAt(start, "unterminated \\p{");
        }
        pos++;
        String expression = sb.toString();
        int equals = expression.indexOf('=');
        boolean valid;
        if (equals < 0) {
            valid = GENERAL_CATEGORIES.contains(expression) || BINARY_PROPERTIES.contains(expression);
        } else {
            String name = expression.substring(0, equals);
            String value = expression.substring(equals + 1);
            valid = switch (name) {
                case "General_Category", "gc" -> GENERAL_CATEGORIES.contains(value);
                case "Script", "sc", "Script_Extensions", "scx" -> isScript(value);
                default -> false;
            };
        }
        if (!valid) {
            throw failAt(start, "\\p{" + expression + "} is not an ECMA-262 Unicode property");
        }
    }

    // ECMA-262 names are case-sensitive: the Unicode name (Old_Italic) or the ISO 15924 code (Ital).
    private static boolean isScript(String value) {
        try {
            Character.UnicodeScript script = Character.UnicodeScript.forName(value);
            return value.equals(scriptName(script)) || SCRIPT_CODE.matcher(value).matches();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static String scriptName(Character.UnicodeScript script) {
        if (script == Character.UnicodeScript.SIGNWRITING) {
            return "SignWriting";
        }
        StringBuilder sb = new StringBuilder();
        for (String part : script.name().split("_")) {
            if (!sb.isEmpty()) {
                sb.append('_');
            }
            sb.append(part.charAt(0)).append(part.substring(1).toLowerCase());
        }
        return sb.toString();
    }

    // After "(?<" or "\k<", up to and with the ">".
    private String groupName() {
        int start = pos;
        StringBuilder sb = new StringBuilder();
        int c = peek();
        if (!(c == '$' || c == '_' || Character.isUnicodeIdentifierStart(c))) {
            throw fail("invalid group name");
        }
        while (!atEnd() && peek() != '>') {
            c = next();
            if (!(c == '$' || c == 0x200C || c == 0x200D || Character.isUnicodeIdentifierPart(c))
                    || Character.isIdentifierIgnorable(c)) {
                throw failAt(start, "invalid group name");
            }
            sb.appendCodePoint(c);
        }
        expect('>');
        return sb.toString();
    }

    private void expect(int c) {
        if (peek() != c) {
            throw fail(atEnd() ? "missing " + (char) c : "expected " + (char) c);
        }
        pos++;
    }

    private boolean startsWith(String prefix) {
        for (int i = 0; i < prefix.length(); i++) {
            if (peek(i) != prefix.charAt(i)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isQuantifier(int c) {
        return c == '*' || c == '+' || c == '?' || c == '{';
    }

    private static boolean isDigit(int c) {
        return c >= '0' && c <= '9';
    }

    private static boolean isHex(int c) {
        return c != -1 && Character.digit(c, 16) >= 0 && c < 128;
    }

    private boolean atEnd() {
        return pos >= chars.length;
    }

    private int peek() {
        return peek(0);
    }

    private int peek(int offset) {
        return pos + offset < chars.length ? chars[pos + offset] : -1;
    }

    private int next() {
        if (atEnd()) {
            throw fail("unexpected end of the pattern");
        }
        return chars[pos++];
    }

    private IllegalArgumentException fail(String reason) {
        return failAt(pos, reason);
    }

    private IllegalArgumentException failAt(int at, String reason) {
        return new IllegalArgumentException(reason + " (at character " + (at + 1) + ")");
    }
}
