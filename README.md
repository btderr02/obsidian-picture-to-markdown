# Pic2Markdown Plugin Documentation

## Overview
Pic2Markdown converts images of handwritten notes into Markdown files in Obsidian. It uses GPT-4o-mini's vision capabilities via an OpenAI API key.

## Key Features
- **Modes**: Single Image, Multi Image (combined note), Bulk (separate notes).
- **API Key**: Requires OpenAI API key with GPT-4o-mini access.

## Usage
1. Click the ribbon icon to upload images.
2. Choose a mode: Single, Multi, or Bulk.
3. Enter or confirm the file name.
4. Click **"Send to GPT-4o"**.

## Settings
- Enter your OpenAI API key in the plugin settings.
    - **Your API key will be stored locally in raw text format inside the plugin.**
- Toggle key visibility with **Show/Hide**.

## Cost
Typical conversion uses ~100,000 input tokens and ~500 output tokens, costing ~1-2 cents per page.