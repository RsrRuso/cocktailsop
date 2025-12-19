# 🚪 Space Doors: Workspaces & Groups
## Team Presentation Guide

---

# 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [My Spaces (Space Doors)](#my-spaces-space-doors)
3. [Workspaces (Store Management)](#workspaces-store-management)
4. [Mixologist Groups](#mixologist-groups)
5. [Teams](#teams)
6. [Procurement Workspaces](#procurement-workspaces)
7. [FIFO Workspaces](#fifo-workspaces)
8. [User Interface Guide](#user-interface-guide)
9. [Quick Reference](#quick-reference)

---

# Executive Summary

Space Doors is a unified system that gives users instant access to all their collaborative spaces—workspaces, groups, teams, and procurement areas—from a single, intuitive interface on their profile.

**Key Value:** One tap to enter any workspace with real-time presence and activity tracking.

---

# My Spaces (Space Doors)

## 🔴 Problem

| Challenge | Impact |
|-----------|--------|
| Users belong to multiple workspaces, groups, and teams | Confusion about where to find things |
| No central view of all memberships | Time wasted navigating between spaces |
| No visibility into who's online or active | Poor collaboration awareness |
| Difficult to manage which spaces are visible | Cluttered interface |

## ✅ Solution

**Space Doors** - A visual, Instagram-style row of circular "doors" on the user's profile that shows all their collaborative spaces at a glance.

### How It Works:
1. **Visual Doors** - Each space appears as a circular icon with the space emoji
2. **Online Indicators** - Green ring shows when members are online
3. **Member Badges** - Small badge shows total member count
4. **One-Tap Access** - Tap any door to open space details
5. **Long-Press Edit** - Long-press to enter edit mode and hide spaces

### UI Location:
- **Profile Page** → Scroll down to "My Spaces" section
- Shows as horizontal scrollable row of circular doors

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Instant Overview** | See all your spaces in one glance |
| **Real-Time Presence** | Know who's online in each space |
| **Quick Navigation** | One tap to access any workspace |
| **Customizable** | Hide spaces you don't use often |
| **Activity Feed** | See what's happening in each space |

---

# Workspaces (Store Management)

## 🔴 Problem

| Challenge | Impact |
|-----------|--------|
| Personal inventory mixed with team inventory | Data confusion and errors |
| No way to share stores with team members | Manual data transfer, duplicated work |
| Single user access to inventory data | Bottleneck for team operations |
| No role-based permissions | Security concerns |

## ✅ Solution

**Store Management Workspaces** - Collaborative spaces where teams can share stores, inventory, and data with role-based access control.

### Key Features:
- **Shared Stores** - All team members see the same stores and inventory
- **Role Management** - Owner, Admin, Manager, Member roles
- **PIN Access** - Secure PIN-based entry for each member
- **Activity Logging** - Track who did what and when
- **Data Preservation** - Deleting workspace keeps data safe (moves to personal)

### How to Access:
1. **Create Workspace:** Profile → Tools → Workspace Management → Create Workspace
2. **Join Workspace:** Receive invite or access via QR code
3. **Switch Workspace:** Space Doors → Tap workspace icon → "Go to Space"

### UI Location:
- **Management:** `/workspace-management` page
- **Access:** Via Space Doors or PIN access page

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Team Collaboration** | Multiple users manage same inventory |
| **Data Isolation** | Workspace data separate from personal |
| **Secure Access** | PIN codes protect entry |
| **Audit Trail** | Full activity history |
| **Scalable** | Add unlimited members |

---

# Mixologist Groups

## 🔴 Problem

| Challenge | Impact |
|-----------|--------|
| Batch recipes scattered across individuals | Inconsistent cocktails |
| No way to share recipes with team | Knowledge silos |
| Production tracking fragmented | No oversight on batch production |
| QR code access limited to creator | Limited operational flexibility |

## ✅ Solution

**Mixologist Groups** - Dedicated spaces for bar teams to share batch recipes, track production, and collaborate on cocktail development.

### Key Features:
- **Shared Recipe Library** - Team recipe vault
- **Batch Production Tracking** - Log who made what, when
- **QR Code Production** - Scan to log production
- **Member PIN Access** - Each member has unique PIN
- **Activity Dashboard** - See all group production

### How to Access:
1. **Create Group:** Batch Calculator → Create Group
2. **Invite Members:** Group Settings → Members → Add
3. **Access:** Space Doors → Tap group icon (🍸)

### UI Location:
- **Calculator:** `/batch-calculator-pin-access?group={id}`
- **Recipes:** `/batch-recipes` (group context)
- **Activity:** `/batch-activity` (group context)

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Recipe Standardization** | Same recipes for all team members |
| **Production Visibility** | Track batch production across team |
| **Knowledge Sharing** | Recipes don't leave when staff leaves |
| **Quality Control** | Consistent cocktail output |
| **Training Tool** | New staff access proven recipes |

---

# Teams

## 🔴 Problem

| Challenge | Impact |
|-----------|--------|
| Tasks managed individually | No visibility into team workload |
| No shared calendar or scheduling | Scheduling conflicts |
| Communication scattered | Important updates missed |
| Project files in multiple places | Time wasted searching |

## ✅ Solution

**Teams** - Collaborative project management spaces with shared tasks, calendar, chat, and document storage.

### Key Features:
- **Shared Tasks** - Assign and track team tasks
- **Team Calendar** - Shared events and scheduling
- **Chat Channels** - Team communication
- **Document Storage** - Shared files and folders
- **Role Permissions** - Control who can do what

### How to Access:
1. **Create Team:** Task Manager → Create Team
2. **Invite Members:** Team Settings → Invite
3. **Access:** Space Doors → Tap team icon (👥)

### UI Location:
- **Tasks:** `/task-manager?team={id}`
- **Calendar:** `/calendar` (team context)
- **Chat:** `/chat` (team channels)

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Centralized Tasks** | All team work in one place |
| **Clear Accountability** | Know who owns each task |
| **Better Communication** | Dedicated team channels |
| **Shared Resources** | Documents accessible to all |

---

# Procurement Workspaces

## 🔴 Problem

| Challenge | Impact |
|-----------|--------|
| Purchase orders managed by single person | Bottleneck, single point of failure |
| No visibility into ordering status | Over-ordering or stock-outs |
| Receiving not tracked systematically | Invoice discrepancies |
| Supplier relationships not shared | Knowledge loss on turnover |

## ✅ Solution

**Procurement Workspaces** - Shared purchasing management for teams handling supplier orders, receiving, and inventory sync.

### Key Features:
- **Shared Purchase Orders** - Team creates and tracks POs
- **Receiving Workflow** - Scan and log received items
- **Supplier Management** - Shared supplier database
- **Inventory Sync** - Auto-update inventory on receipt
- **Cost Tracking** - Monitor procurement costs

### How to Access:
1. **Create Workspace:** Procurement → Create Workspace
2. **Invite Team:** Workspace Settings → Members
3. **Access:** Space Doors → Tap procurement icon (📦)

### UI Location:
- **Orders:** `/purchase-orders?workspace={id}`
- **Receiving:** `/scan-receive` (workspace context)
- **Items:** `/po-master-items` (workspace context)

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Shared Ordering** | Multiple team members can order |
| **Receiving Accuracy** | Scan-based receiving reduces errors |
| **Cost Visibility** | Track spending across team |
| **Supplier Data** | Maintain supplier relationships |

---

# FIFO Workspaces

## 🔴 Problem

| Challenge | Impact |
|-----------|--------|
| FIFO tracking individual to each user | Inconsistent rotation practices |
| No shared expiration monitoring | Food safety risks |
| Wastage data not aggregated | No insight into waste patterns |
| Temperature logs scattered | Compliance documentation gaps |

## ✅ Solution

**FIFO Workspaces** - Team-based first-in-first-out inventory tracking with shared expiration monitoring and waste tracking.

### Key Features:
- **Shared FIFO Tracking** - Team monitors same inventory
- **Expiration Alerts** - Notifications for expiring items
- **Waste Logging** - Track and analyze waste
- **Temperature Logs** - Shared equipment monitoring
- **Activity Feed** - Who did what in FIFO system

### How to Access:
1. **Create Workspace:** FIFO Management → Create Workspace
2. **Invite Team:** Workspace Settings → Add Members
3. **Access:** Space Doors → Tap FIFO icon (📊)

### UI Location:
- **Dashboard:** `/fifo-pin-access?workspace={id}`
- **Activity:** `/fifo-activity-log` (workspace context)
- **Management:** `/fifo-workspace-management`

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Team FIFO** | Everyone follows same rotation |
| **Reduced Waste** | Expiration visibility prevents spoilage |
| **Compliance** | Documentation for food safety audits |
| **Data Insights** | Aggregate waste analysis |

---

# User Interface Guide

## Space Doors Visual Elements

```
┌─────────────────────────────────────────────────────────────┐
│  🚪 My Spaces                                    [Restore] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐    │
│   │ 🏪  │   │ 🍸  │   │ 👥  │   │ 📦  │   │ 📊  │    │
│   │      │   │      │   │      │   │      │   │      │    │
│   │ [●5] │   │ [●2] │   │     │   │     │   │ [●1] │    │
│   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘    │
│   [👤 12]    [👤 8]     [👤 5]     [👤 3]     [👤 6]     │
│   Bar Team   Mixology   Project   Ordering    Kitchen     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Legend:
🏪 = Store Management Workspace
🍸 = Mixologist Group  
👥 = Team
📦 = Procurement Workspace
📊 = FIFO Workspace

[●N] = N members online (green ring when active)
[👤 N] = Total N members
```

## Interaction Patterns

| Action | Result |
|--------|--------|
| **Tap** | Opens space detail sheet |
| **Long Press** | Enters edit mode (shows X to hide) |
| **Tap X** | Hides space from view |
| **Swipe** | Scroll through spaces |
| **Restore** | Brings back hidden spaces |

## Space Detail Sheet

When you tap a space door, a bottom sheet appears with:

1. **Header** - Space name, icon, member count, online count
2. **Tabs:**
   - **Members** - List of all members with roles
   - **Activity** - Recent actions in the space
   - **Online** - Currently active members
3. **Action Button** - "Go to Space" to enter

---

# Quick Reference

## Space Types at a Glance

| Type | Icon | Purpose | Route Pattern |
|------|------|---------|---------------|
| Store Management | 🏪 | Inventory & stores | `/store-management-pin-access?workspace={id}` |
| Mixologist Group | 🍸 | Batch recipes & production | `/batch-calculator-pin-access?group={id}` |
| Team | 👥 | Tasks & projects | `/task-manager?team={id}` |
| Procurement | 📦 | Purchase orders | `/purchase-orders?workspace={id}` |
| FIFO | 📊 | Expiration tracking | `/fifo-pin-access?workspace={id}` |

## Role Hierarchy

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, delete workspace, manage all |
| **Admin** | Manage members, settings, full access |
| **Manager** | Operational control, limited settings |
| **Member** | Standard access, view and contribute |

## Common Actions

| Task | Steps |
|------|-------|
| Create a workspace | Tools → Workspace Management → Create |
| Invite a member | Space Settings → Members → Add |
| Hide a space | Long-press door → Tap X |
| Restore hidden spaces | My Spaces → Restore button |
| Switch workspace context | Space Doors → Tap door → Go to Space |

---

# Summary

**Space Doors** transforms how teams collaborate by providing:

✅ **Unified Access** - All spaces in one visual interface  
✅ **Real-Time Awareness** - See who's online, what's happening  
✅ **Role-Based Security** - Right access for each team member  
✅ **Seamless Navigation** - One tap to any workspace  
✅ **Flexible Organization** - Hide, restore, customize view  

**The Result:** Teams work faster, stay aligned, and maintain visibility across all their collaborative spaces.

---

*Document Version: 1.0*  
*Last Updated: December 2024*
