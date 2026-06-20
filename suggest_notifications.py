#!/usr/bin/env python3
"""
Run this once to get Claude's suggestions for useful personal notifications.
Requires: pip install anthropic
Set ANTHROPIC_API_KEY in your environment before running.
"""

import anthropic

PROFILE = """
Name: Joe Brashear
Role: Software developer on a small team (2-5 people)
Primary stack: Swift/iOS, with occasional Python, Node/TypeScript, and Go
Work style: Values code quality, safety, and careful Git practices
Uses Claude Code heavily as a daily development tool
"""

PROMPT = f"""
Here is a profile of a developer:

{PROFILE}

You are helping them set up a personal notification system that runs on a schedule via GitHub Actions.
Each notification is a prompt sent to Claude on a recurring schedule — the result gets pushed to them
as a notification (e.g. daily, weekly, on weekdays).

Based on their profile, suggest 8–12 specific, high-value notifications they should subscribe to.
For each one, provide:
- name: short identifier (snake_case)
- schedule: cron expression (e.g. "0 9 * * 1-5" for weekday mornings at 9am UTC)
- prompt: the exact prompt Claude will receive to generate the notification content
- why: one sentence on why this is useful for someone with their profile

Format your response as a clean numbered list. Be specific and practical — avoid generic suggestions.
Focus on things that would genuinely save a developer time or surface useful information they'd otherwise miss.
"""

def main():
    client = anthropic.Anthropic()
    print("Asking Claude for notification suggestions based on your profile...\n")

    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=2048,
        messages=[{"role": "user", "content": PROMPT}],
    )

    print(message.content[0].text)


if __name__ == "__main__":
    main()
