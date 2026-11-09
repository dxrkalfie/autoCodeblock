/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DxrkAlfie and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    minLines: {
        type: OptionType.NUMBER,
        description: "Minimum lines before wrapping",
        default: 3
    },
    minScore: {
        type: OptionType.NUMBER,
        description: "How many code patterns need to match",
        default: 2
    },
    bypassPrefix: {
        type: OptionType.STRING,
        description: "Prefix to skip wrapping",
        default: "!raw "
    }
});

const langs: Record<string, RegExp[]> = {
    lua: [
        /\blocal\s+\w+/,
        /\bfunction\b.*\)/,
        /^\s*end\)?\s*$/m,
        /\b(then|do)\s*$/m,
        /~=|\bnil\b/,
        /\b(RegisterNetEvent|AddEventHandler|TriggerServerEvent|TriggerClientEvent|TriggerEvent|CreateThread|RegisterCommand|RegisterNUICallback|SendNUIMessage)\b/,
        /\b(QBCore|ESX|PlayerData)\b/,
        /\bfx_version\b/
    ],
    js: [
        /\b(const|let|var)\s+\w+\s*=/,
        /=>/,
        /\bfunction\s+\w+\(/,
        /\bimport\s.+\sfrom\s/,
        /\bconsole\.\w+\(/,
        /;\s*$/m
    ],
    python: [
        /^\s*def\s+\w+\(.*\):/m,
        /^\s*(import|from)\s+\w+/m,
        /^\s*(if|elif|else|for|while|try|except).*:\s*$/m,
        /\bself\./,
        /\bprint\(/
    ],
    html: [
        /<!DOCTYPE|<html|<div|<script|<style/i,
        /<\/[a-z][\w-]*>/i
    ],
    css: [
        /[.#]?[\w-]+\s*\{[^}]*:[^}]*;/s,
        /^\s*[\w-]+\s*:\s*[^;\n]+;\s*$/m,
        /@media|@keyframes|:root/
    ],
    sql: [
        /\bSELECT\b[\s\S]+\bFROM\b/i,
        /\b(INSERT INTO|UPDATE \w+ SET|DELETE FROM|CREATE TABLE)\b/i,
        /\b(WHERE|JOIN|GROUP BY|ORDER BY)\b/i
    ]
};

function isJson(text: string) {
    if (!/^[\[{]/.test(text) || !/[\]}]$/.test(text)) return false;
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

function guessLang(text: string, minScore: number) {
    if (isJson(text)) return "json";

    let best = "";
    let top = 0;
    for (const [lang, patterns] of Object.entries(langs)) {
        const score = patterns.filter(p => p.test(text)).length;
        if (score > top) {
            best = lang;
            top = score;
        }
    }
    return top >= minScore ? best : null;
}

export default definePlugin({
    name: "AutoCodeblock",
    description: "Wraps pasted code in a codeblock automatically",
    authors: [{ name: "DxrkAlfie", id: 1301298434971664600n }],
    settings,

    onBeforeMessageSend(_, msg) {
        const { minLines, minScore, bypassPrefix } = settings.store;
        const content: string = msg.content;

        if (bypassPrefix && content.startsWith(bypassPrefix)) {
            msg.content = content.slice(bypassPrefix.length);
            return;
        }

        if (!content || content.includes("```")) return;

        const text = content.trim();
        if (text.split("\n").length < minLines) return;

        const lang = guessLang(text, minScore);
        if (!lang) return;

        const wrapped = "```" + lang + "\n" + text + "\n```";
        if (wrapped.length > 2000 && content.length <= 2000) return;

        msg.content = wrapped;
    }
});
