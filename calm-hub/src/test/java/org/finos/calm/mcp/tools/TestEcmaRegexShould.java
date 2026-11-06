package org.finos.calm.mcp.tools;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

class TestEcmaRegexShould {

    @ParameterizedTest
    @ValueSource(strings = {
            "", "abc", "^[a-z][a-z0-9-]*$", "^https?://", "^(?:/(?:[^~/]|~[01])*)*$",
            "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+)?$",
            "^/(?:[A-Za-z0-9._~-]+|\\{[A-Za-z][A-Za-z0-9_-]*\\})$|^/$",
            "a*?b+?c??d{2}e{2,}f{2,3}?", "(?=a)(?!b)(?<=c)(?<!d)", "(?<year>\\d{4})-\\k<year>", "(a)(b)\\2\\1",
            "\\bword\\B", "[\\d\\s\\w\\D\\S\\W]", "[^\\]\\-\\b]", "[-a]", "[a-]", "[]", "[^]", "\\x41\\u0041\\u{1F600}",
            "\\uD83D\\uDE00", "\\cJ\\f\\n\\r\\t\\v\\0", "\\^\\$\\\\\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|\\/",
            "\\p{L}\\p{Lu}\\P{Letter}\\p{Script=Latin}\\p{sc=Grek}\\p{scx=Old_Italic}\\p{gc=Nd}\\p{ASCII_Hex_Digit}",
            "[\\p{L}_]", "a|b|", ".", "[&]", "😀+"
    })
    void accept_an_ecma_262_pattern(String pattern) {
        assertThat(EcmaRegex.error(pattern), nullValue());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "(?i)abc", "(?>a)", "(?#comment)", "a++", "a*+", "a?+", "a{2}+", "\\Qa.b\\E", "\\h+", "\\H",
            "\\Aabc", "abc\\z", "abc\\Z", "\\G", "\\R", "\\X", "\\e", "\\a", "[a-z&&[^x]]", "[[a]]", "\\x{41}",
            "\\N{LATIN SMALL LETTER A}", "\\pL", "\\p{Punct}", "\\p{IsLatin}", "\\p{InGreek}", "\\p{javaLowerCase}",
            "\\p{sc=LATIN}", "\\p{Script=Nope}", "\\p{Foo=Bar}", "\\p{L", "\\012", "\\1", "(a)\\2", "\\k<x>", "(?<x>a)\\k<y>",
            "(?<x>a)(?<x>b)", "(?<1x>a)", "\\-", "\\y", "*a", "a**", "^*", "$+", "\\b+", "(?=a)*", "(?<=a)+", "a{", "a{1",
            "a{,2}", "a{3,2}", "}", "]", "(", ")", "(a", "[a", "[z-a]", "[\\d-z]", "[a-\\w]", "\\", "\\u12", "\\u{110000}",
            "\\u{}", "\\xG0", "\\c1", "a|*"
    })
    void refuse_a_pattern_that_is_not_ecma_262(String pattern) {
        assertThat(pattern, EcmaRegex.error(pattern), notNullValue());
    }

    // Valid in current ECMA-262, but older engines refuse modifiers and repeated group names, and Java reads && in a class as an intersection.
    @ParameterizedTest
    @ValueSource(strings = {"(?i:abc)", "(?-i:a)", "[a&&b]", "(?<x>a)|(?<x>b)"})
    void refuse_a_pattern_that_clients_or_java_read_differently(String pattern) {
        assertThat(pattern, EcmaRegex.error(pattern), notNullValue());
    }

    @Test
    void refuse_a_pattern_whose_groups_are_nested_too_deep() {
        String deepest = "(".repeat(EcmaRegex.MAX_DEPTH) + "a" + ")".repeat(EcmaRegex.MAX_DEPTH);
        String deeper = "(?:".repeat(EcmaRegex.MAX_DEPTH + 1) + "a" + ")".repeat(EcmaRegex.MAX_DEPTH + 1);

        assertThat(EcmaRegex.error(deepest), nullValue());
        assertThat(EcmaRegex.error("(?=" + deepest + ")"), is("groups are nested more than 64 deep (at character 67)"));
        assertThat(EcmaRegex.error(deeper), is("groups are nested more than 64 deep (at character 193)"));
        assertThat(EcmaRegex.error("(a)".repeat(300)), nullValue());
    }

    @Test
    void refuse_a_pattern_that_is_too_long() {
        assertThat(EcmaRegex.error("a".repeat(EcmaRegex.MAX_LENGTH)), nullValue());
        assertThat(EcmaRegex.error("😀".repeat(EcmaRegex.MAX_LENGTH)), nullValue());
        assertThat(EcmaRegex.error("a".repeat(EcmaRegex.MAX_LENGTH + 1)), is("it is longer than 1000 characters"));
        assertThat(EcmaRegex.error("(".repeat(1_000_000)), is("it is longer than 1000 characters"));
    }
}
