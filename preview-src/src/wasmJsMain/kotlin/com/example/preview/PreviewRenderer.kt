package com.example.preview

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.remotecompose.shared.ElementConfig
import com.example.remotecompose.shared.LayoutConfig
import com.example.remotecompose.shared.parseColorLong

private fun parseColor(hex: String): Color = Color(parseColorLong(hex))

@Composable
fun PreviewRenderer(config: LayoutConfig) {
    val bgColor = parseColor(config.backgroundColor)
    val scrollState = rememberScrollState()

    var modifier = Modifier.fillMaxSize().background(bgColor)
    if (config.scrollable) {
        modifier = modifier.verticalScroll(scrollState)
    }
    modifier = modifier.padding((config.padding ?: 24).dp)

    Column(
        modifier = modifier,
        verticalArrangement = if (config.scrollable) Arrangement.Top else Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        config.elements.forEach { element ->
            RenderElement(element)
        }
    }
}

@Composable
private fun RenderElement(el: ElementConfig) {
    when (el.type) {
        "text" -> TextElement(el)
        "button" -> ButtonElement(el)
        "spacer" -> SpacerElement(el)
        "divider" -> DividerElement(el)
        "card" -> CardElement(el)
        "row" -> RowElement(el)
    }
}

@Composable
private fun TextElement(el: ElementConfig) {
    val padH = el.paddingH ?: 0
    val padV = el.paddingV ?: 0
    Text(
        text = el.text ?: "",
        fontSize = (el.fontSize ?: 16).sp,
        color = parseColor(el.color ?: "#000000"),
        modifier = Modifier
            .padding(bottom = 8.dp)
            .then(if (padH > 0 || padV > 0) Modifier.padding(horizontal = padH.dp, vertical = padV.dp) else Modifier)
    )
}

@Composable
private fun ButtonElement(el: ElementConfig, fillWidth: Boolean = true) {
    val radius = el.cornerRadius ?: 24
    val bgColor = parseColor(el.color ?: "#6200EA")
    val shape = RoundedCornerShape(radius.dp)

    var mod = if (fillWidth) Modifier.fillMaxWidth() else Modifier
    mod = mod
        .clip(shape)
        .background(bgColor)

    if (el.borderColor != null && (el.borderWidth ?: 0) > 0) {
        mod = mod.border(
            width = (el.borderWidth ?: 1).dp,
            color = parseColor(el.borderColor!!),
            shape = shape
        )
    }

    mod = mod
        .clickable { }
        .padding(
            horizontal = (el.paddingH ?: 32).dp,
            vertical = (el.paddingV ?: 14).dp
        )

    Box(
        modifier = mod,
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = el.text ?: "Button",
            fontSize = (el.fontSize ?: 16).sp,
            color = parseColor(el.textColor ?: "#FFFFFF"),
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun SpacerElement(el: ElementConfig) {
    Spacer(modifier = Modifier.height((el.height ?: 16).dp))
}

@Composable
private fun DividerElement(el: ElementConfig) {
    HorizontalDivider(
        thickness = (el.height ?: 1).dp,
        color = parseColor(el.color ?: "#CCCCCC")
    )
}

@Composable
private fun CardElement(el: ElementConfig) {
    val radius = el.cornerRadius ?: 16
    val cardBg = parseColor(el.color ?: "#FFFFFF")
    val shape = RoundedCornerShape(radius.dp)

    val alignment = when (el.align) {
        "start" -> Alignment.Start
        "end" -> Alignment.End
        else -> Alignment.CenterHorizontally
    }

    var mod = Modifier.fillMaxWidth()

    if (radius > 0) {
        mod = mod.clip(shape)
    }

    mod = mod.background(cardBg, shape)

    if (el.borderColor != null && (el.borderWidth ?: 0) > 0) {
        mod = mod.border(
            width = (el.borderWidth ?: 1).dp,
            color = parseColor(el.borderColor!!),
            shape = shape
        )
    }

    if (el.actionName != null) {
        mod = mod.clickable { }
    }

    val padH = el.paddingH ?: 16
    val padV = el.paddingV ?: 16
    if (padH > 0 || padV > 0) {
        mod = mod.padding(horizontal = padH.dp, vertical = padV.dp)
    }

    Box(modifier = mod) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = alignment
        ) {
            el.children?.forEach { child ->
                RenderElement(child)
            }
        }
    }
}

@Composable
private fun RowElement(el: ElementConfig) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        el.children?.forEach { child ->
            when (child.type) {
                "button" -> ButtonElement(child, fillWidth = false)
                else -> RenderElement(child)
            }
        }
    }
}
