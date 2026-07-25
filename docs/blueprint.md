# TodoFlow Bot — Bot specification

**Archetype:** workflow

**Voice:** warm and efficient — write every user-facing message, button label, error, and empty state in this voice.

A Telegram-based task management system with personal and shared team lists. Supports task creation with due dates, reminders, assignments, comments, and activity tracking. Shared lists enable real-time notifications and permissions management for collaborative workflows.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Individuals
- Small teams

## Success criteria

- Users create and manage tasks with due dates/assignments
- Team members receive real-time notifications for list changes
- Activity history shows last 90 days of task modifications
- Shared lists can be exported as JSON

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Initialize personal list and show quick guide
- **Create List** (button, actor: user, callback: list:create) — Generate new personal or shared task list
- **Add Task** (button, actor: user, callback: task:add) — Create task with title, description, and optional due date/assignee
- **Share List** (button, actor: user, callback: list:share) — Generate invite link or send handle-based invitation
- **Manage Members** (button, actor: user, callback: list:members) — Add/remove members or modify roles

## Flows

### Onboarding
_Trigger:_ /start

1. Create personal inbox list
2. Display quick guide with core features

_Data touched:_ User, List

### Task Assignment
_Trigger:_ task:assign

1. Select task
2. Choose assignee from members
3. Send assignment notification

_Data touched:_ Task, Membership, Activity entry

### Shared List Invitation
_Trigger:_ list:share

1. Generate invite link
2. Send invitation via Telegram handle
3. Wait for acceptance

_Data touched:_ List, Membership

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account with chat ID
  - fields: chat_id, name
- **List** _(retention: persistent)_ — Task collection with ownership and access controls
  - fields: id, owner_id, members, permissions
- **Task** _(retention: persistent)_ — Action item with status tracking and metadata
  - fields: id, title, description, assignee_id, due_date, reminder_time, status, comments
- **Comment** _(retention: persistent)_ — Task discussion notes with attribution
  - fields: task_id, author_id, text, timestamp
- **Activity entry** _(retention: persistent)_ — Record of list/task modifications
  - fields: list_id, actor_id, action_type, timestamp
- **Membership** _(retention: persistent)_ — User access rights to shared lists
  - fields: list_id, user_id, role

## Integrations

- **Telegram** (required) — User interaction and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Approve/reject list join requests
- Promote members to admins
- Export list data as JSON
- Configure default notification settings

## Notifications

- Task updates trigger direct messages with action buttons
- Reminders sent to assignees and creators
- Join requests require owner approval

## Permissions & privacy

- Owners control list access via invite-only model
- Members can only edit tasks if not read-only
- Activity feed visible only to list members

## Edge cases

- User declines shared list invitation
- Task due date in past with no reminder set
- Member tries to modify read-only task

## Required tests

- End-to-end shared list invitation workflow
- Task reminder delivery to assignee
- Activity feed retention after 90 days

## Assumptions

- Default 90-day activity retention is sufficient
- Invite links expire after 7 days
- Owners will manually approve all join requests
