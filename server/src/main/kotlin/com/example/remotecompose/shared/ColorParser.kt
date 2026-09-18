package com.example.remotecompose.shared

fun parseColorLong(hex: String): Long {
    val sanitized = hex.removePrefix("#")
    val colorLong = sanitized.toLong(16)
    return if (sanitized.length == 6) {
        0xFF000000L or colorLong
    } else {
        colorLong
    }
}
