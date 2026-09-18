package com.example.remotecompose.server

import com.example.remotecompose.shared.LayoutConfig
import kotlinx.serialization.json.Json
import java.io.File

private val json = Json { ignoreUnknownKeys = true }

fun main(args: Array<String>) {
    if (args.isEmpty()) {
        System.err.println("Usage: remotecompose-server <input.json> [output.rc]")
        System.err.println("       remotecompose-server --dir <input-dir> <output-dir>")
        System.exit(1)
    }

    if (args[0] == "--dir" && args.size >= 3) {
        val inputDir = File(args[1])
        val outputDir = File(args[2])
        outputDir.mkdirs()

        val jsonFiles = inputDir.listFiles { f -> f.extension == "json" } ?: emptyArray()
        println("Converting ${jsonFiles.size} config files...")

        for (jsonFile in jsonFiles) {
            val outputFile = File(outputDir, jsonFile.nameWithoutExtension + ".rc")
            convertFile(jsonFile, outputFile)
        }

        println("Done. Output in: ${outputDir.absolutePath}")
    } else {
        val inputFile = File(args[0])
        val outputFile = if (args.size > 1) File(args[1])
            else File(inputFile.parent, inputFile.nameWithoutExtension + ".rc")
        convertFile(inputFile, outputFile)
    }
}

private fun convertFile(input: File, output: File) {
    val configJson = input.readText()
    val config = json.decodeFromString<LayoutConfig>(configJson)
    val bytes = buildDocument(config)
    output.writeBytes(bytes)
    println("  ${input.name} -> ${output.name} (${bytes.size} bytes)")
}
