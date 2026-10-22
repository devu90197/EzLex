package com.ezlex.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.ui.theme.Ez

/** Lightweight Markdown for AI answers and drafts: headings, bold/italic, bullets, numbered lists, rules. */
@Composable
fun MarkdownText(markdown: String, modifier: Modifier = Modifier) {
    SelectionContainer(modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            markdown.replace("\r", "").split("\n").forEach { raw ->
                val line = raw.trimEnd()
                val t = line.trimStart()
                when {
                    t.isBlank() -> {}
                    t.matches(Regex("^(-{3,}|\\*{3,}|_{3,})$")) -> HorizontalDivider(color = Ez.Muted.copy(alpha = 0.4f))
                    t.startsWith("#") -> {
                        val level = t.takeWhile { it == '#' }.length
                        Text(
                            inline(t.drop(level).trim()),
                            fontSize = when (level) { 1 -> 20.sp; 2 -> 17.sp; else -> 15.sp },
                            fontWeight = FontWeight.ExtraBold, color = Ez.Ink,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                    Regex("^[-*•]\\s+").containsMatchIn(t) -> Bullet("•", t.replaceFirst(Regex("^[-*•]\\s+"), ""), (line.length - t.length) / 2)
                    Regex("^\\d+[.)]\\s+").containsMatchIn(t) -> {
                        val n = t.takeWhile { it.isDigit() }
                        Bullet("$n.", t.replaceFirst(Regex("^\\d+[.)]\\s+"), ""), (line.length - t.length) / 2)
                    }
                    t.startsWith(">") -> Text(inline(t.drop(1).trim()), fontStyle = FontStyle.Italic, color = Ez.Slate, fontSize = 14.sp)
                    else -> Text(inline(t), fontSize = 14.sp, lineHeight = 21.sp, color = Ez.Ink.copy(alpha = 0.85f))
                }
            }
        }
    }
}

@Composable
private fun Bullet(mark: String, text: String, indent: Int) {
    Row(Modifier.padding(start = (indent * 12).dp)) {
        Text(mark, fontWeight = FontWeight.Bold, color = Ez.Indigo, fontSize = 14.sp, modifier = Modifier.width(22.dp))
        Text(inline(text), fontSize = 14.sp, lineHeight = 21.sp, color = Ez.Ink.copy(alpha = 0.85f))
    }
}

/** **bold**, *italic* / _italic_ */
private fun inline(s: String): AnnotatedString = buildAnnotatedString {
    var i = 0
    while (i < s.length) {
        when {
            s.startsWith("**", i) && s.indexOf("**", i + 2) > 0 -> {
                val end = s.indexOf("**", i + 2)
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = Ez.Ink)) { append(s.substring(i + 2, end)) }
                i = end + 2
            }
            (s[i] == '*' || s[i] == '_') && i + 1 < s.length && s[i + 1] != ' ' && s.indexOf(s[i], i + 1) > 0 -> {
                val end = s.indexOf(s[i], i + 1)
                withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(s.substring(i + 1, end)) }
                i = end + 1
            }
            else -> { append(s[i]); i++ }
        }
    }
}
