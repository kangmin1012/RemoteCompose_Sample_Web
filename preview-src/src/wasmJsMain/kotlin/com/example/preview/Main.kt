package com.example.preview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.platform.Font
import androidx.compose.ui.window.ComposeViewport
import com.example.preview.resources.Res
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.ExperimentalResourceApi
import kotlinx.browser.document
import com.example.remotecompose.shared.LayoutConfig
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

external interface MessageEventData : JsAny {
    val data: JsString?
}

@JsFun("(event) => { const d = event.data; return (typeof d === 'string') ? d : (typeof d === 'object' ? JSON.stringify(d) : ''); }")
external fun getMessageData(event: JsAny): String

var globalConfig: LayoutConfig = LayoutConfig()
var configVersion: Int = 0

@JsFun("(callback) => { window.addEventListener('message', (e) => { callback(e); }); }")
external fun addMessageListener(callback: (JsAny) -> Unit)

@OptIn(ExperimentalResourceApi::class)
private suspend fun loadPreviewFonts(): FontFamily = coroutineScope {
    val regular = async { Res.readBytes("files/fonts/NanumGothic-Regular.ttf") }
    val bold = async { Res.readBytes("files/fonts/NanumGothic-Bold.ttf") }
    FontFamily(
        Font("NanumGothic-Regular", regular.await(), FontWeight.Normal),
        Font("NanumGothic-Bold", bold.await(), FontWeight.Bold),
    )
}

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    val body = document.body ?: return

    addMessageListener { event ->
        try {
            val str = getMessageData(event)
            if (str.startsWith("{")) {
                globalConfig = json.decodeFromString<LayoutConfig>(str)
                configVersion++
            }
        } catch (_: Exception) {}
    }

    // Canvas text cannot use the editor's CSS/system font fallback. Load the
    // bundled Korean fonts before the first frame, including on a cold cache.
    MainScope().launch {
        val fonts = try {
            loadPreviewFonts()
        } catch (error: Exception) {
            document.getElementById("loading-message")?.textContent =
                "미리보기 글꼴을 불러오지 못했습니다. 다시 시도해 주세요."
            document.getElementById("retry")?.removeAttribute("hidden")
            return@launch
        }
        document.getElementById("loading")?.remove()
        ComposeViewport(body) {
            var config by remember { mutableStateOf(globalConfig) }
            var version by remember { mutableIntStateOf(configVersion) }

            LaunchedEffect(Unit) {
                kotlinx.coroutines.delay(100)
                while (true) {
                    if (configVersion != version) {
                        config = globalConfig
                        version = configVersion
                    }
                    kotlinx.coroutines.delay(50)
                }
            }

            Box(modifier = Modifier.fillMaxSize().background(Color.White)) {
                ProvideTextStyle(TextStyle(fontFamily = fonts)) {
                    PreviewRenderer(config)
                }
            }
        }
    }
}
