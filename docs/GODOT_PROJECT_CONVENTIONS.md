# Godot Project Conventions

## Folder & Naming Structure

```
res://
├── addons/                      # Third-party addons (keep as-is, don't modify)
├── assets/
│   ├── animations/
│   │   ├── characters/
│   │   └── ui/
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   ├── fonts/
│   ├── materials/
│   │   ├── characters/
│   │   ├── environment/
│   │   └── ui/
│   ├── models/
│   │   ├── characters/
│   │   ├── environment/
│   │   │   ├── cafe/
│   │   │   └── library/
│   │   └── props/
│   ├── shaders/
│   ├── textures/
│   │   ├── characters/
│   │   ├── environment/
│   │   │   ├── cafe/
│   │   │   └── library/
│   │   ├── props/
│   │   └── ui/
│   └── ui/
│       ├── icons/
│       ├── sprites/
│       └── themes/
├── autoloads/                   # Singleton scripts (autoloaded)
├── resources/                   # Custom resource files (.tres)
│   ├── characters/
│   ├── items/
│   └── settings/
├── scenes/
│   ├── characters/
│   ├── environment/
│   │   ├── cafe/
│   │   └── library/
│   ├── main/
│   ├── props/
│   └── ui/
├── scripts/
│   ├── characters/
│   ├── core/
│   ├── networking/
│   ├── ui/
│   └── utils/
└── project.godot
```

## Naming Conventions

| Type | Convention | ✅ Good | ❌ Bad |
|------|------------|---------|--------|
| **Folders** | snake_case | `cafe_props/` | `CafeProps/`, `Cafe Props/` |
| **Scenes** | snake_case | `cafe_scene.tscn` | `CafeScene.tscn`, `cafe-scene.tscn` |
| **Scripts** | snake_case | `player_controller.gd` | `PlayerController.gd` |
| **Resources** | snake_case | `wood_floor.tres` | `WoodFloor.tres` |
| **Materials** | snake_case | `wood_floor_mat.tres` | `Wood_Floor.mat` |
| **Textures** | snake_case + suffix | `wood_floor_albedo.png` | `woodfloor.png` |
| **Shaders** | snake_case | `toon_shader.gdshader` | `ToonShader.gdshader` |
| **Animations** | snake_case + action | `player_idle.tres` | `Idle.tres` |
| **Classes** | PascalCase (in script) | `class_name PlayerController` | `class_name player_controller` |

## Texture Suffixes (PBR)

```
wood_floor_albedo.png        # Base color / diffuse
wood_floor_normal.png        # Normal map (use OpenGL format)
wood_floor_roughness.png     # Roughness map
wood_floor_metallic.png      # Metallic map
wood_floor_ao.png            # Ambient occlusion
wood_floor_height.png        # Height / displacement
wood_floor_emission.png      # Emission map
wood_floor_orm.png           # Combined: AO (R), Roughness (G), Metallic (B)
```

## Naming Rules

1. **Use snake_case for files** — Godot convention, matches GDScript style
2. **No spaces in names** — use underscores instead
3. **No duplicate folders** — don't have both `models/` and `Models/`
4. **No redundant nesting** — `models/3d_models/` is unnecessary
5. **Mirror structure across folders** — if `models/environment/cafe/` exists, so should `textures/environment/cafe/`
6. **Prefix WIP assets** — `wip_new_chair.tscn` for work in progress
7. **Keep addons untouched** — never rename or reorganize third-party addons
8. **Use class_name for reusable scripts** — enables type hints and editor visibility

## Node Naming in Scenes

| Node Type | Convention | ✅ Good | ❌ Bad |
|-----------|------------|---------|--------|
| **Root nodes** | PascalCase | `Player`, `MainMenu` | `player`, `main_menu` |
| **Child nodes** | PascalCase | `AnimationPlayer`, `CollisionShape3D` | `animation_player` |
| **UI nodes** | PascalCase + type hint | `HealthBar`, `StartButton` | `health_bar`, `btn_start` |
| **Grouped nodes** | PascalCase | `Enemies`, `Decorations` | `enemies_group` |

## Script Organization

```gdscript
# 1. Tool mode (if needed)
@tool

# 2. Class name
class_name PlayerController
extends CharacterBody3D

# 3. Signals
signal health_changed(new_health: int)
signal died

# 4. Enums
enum State { IDLE, WALKING, RUNNING }

# 5. Constants
const SPEED := 5.0
const JUMP_VELOCITY := 4.5

# 6. Exported variables (inspector)
@export var max_health: int = 100
@export_group("Movement")
@export var acceleration: float = 10.0

# 7. Public variables
var current_state: State = State.IDLE

# 8. Private variables (prefix with _)
var _health: int = 100
var _is_initialized: bool = false

# 9. Onready variables
@onready var animation_player: AnimationPlayer = $AnimationPlayer
@onready var collision_shape: CollisionShape3D = $CollisionShape3D

# 10. Built-in virtual methods
func _ready() -> void:
    pass

func _process(delta: float) -> void:
    pass

func _physics_process(delta: float) -> void:
    pass

# 11. Public methods
func take_damage(amount: int) -> void:
    pass

# 12. Private methods
func _update_health_bar() -> void:
    pass
```

---

# Git & Godot Settings

## Project Settings for Version Control

Godot 4 uses text-based formats by default, making it Git-friendly out of the box.

### Recommended Settings

1. **Use .tscn format** (text) instead of .scn (binary) for scenes you edit frequently
2. **Enable external editor** if using VS Code or another IDE
3. **Set up .gdignore** files in folders you want Godot to skip

### .gitignore for Godot

```gitignore
# Godot 4+ specific ignores
.godot/

# Godot-specific ignores
*.translation

# Imported textures and other assets
.import/

# Mono-specific ignores (if using C#)
.mono/
data_*/
mono_crash.*.json

# Export templates
export_presets.cfg

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE specific
.vscode/
*.code-workspace
.idea/

# Build outputs
builds/
*.pck
*.zip

# Local development
*.local.tres
local_settings.cfg
```

### What to Commit

| File Type | Commit? | Notes |
|-----------|---------|-------|
| `.tscn` | ✅ Yes | Scene files (text format) |
| `.scn` | ✅ Yes | Scene files (binary) - avoid for frequently edited scenes |
| `.tres` | ✅ Yes | Resource files |
| `.gd` | ✅ Yes | Scripts |
| `.gdshader` | ✅ Yes | Shader files |
| `.import` | ✅ Yes | Import settings (required for consistent imports) |
| `project.godot` | ✅ Yes | Project configuration |
| `export_presets.cfg` | ⚠️ Maybe | Contains export settings, may have local paths |
| `.godot/` | ❌ No | Cache and generated files |

---

## Branch Naming / Creation / Commits

### Branch Naming Convention

```
<name>/<type>/<description>

Types:
- feature/  - New features
- bug/      - Bug fixes
- refactor/ - Code refactoring
- docs/     - Documentation
- wip/      - Work in progress experiments
```

**Examples:**
- `chase/bug/ui-crashing-on-second-session`
- `dante/feature/character-gui-ui-logic`
- `hamza/refactor/material-organization`

### Commit Message Format

```
<type>: <short description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `style:` - Formatting, no code change
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add soft shadows to library scene

fix: resolve material metallic values causing plastic look

refactor: reorganize library materials into proper folders

[WIP] feat: multiplayer session sync
```

### Work in Progress

- Add **[WIP]** prefix to commit messages for incomplete work
- **ALWAYS push your code at the end of the day**, even if WIP

---

## Before You Push

### Checklist

- [ ] Save all scenes (Ctrl+S in each open scene)
- [ ] Save project (Project → Save All)
- [ ] Check Output panel for errors
- [ ] Test by running the main scene briefly
- [ ] Check that `.import` files are included if you added new assets

### Quick Test Command

```bash
# Validate project opens without errors (headless)
godot --headless --quit
```

---

## Merge Conflict Protocol

### Scene Conflicts (.tscn)

Godot's text-based scene format is more mergeable than Unity, but still:

1. **Simple conflicts** → Can often be resolved in text editor
2. **Complex conflicts** → One person discards, re-applies changes manually
3. **Node ID conflicts** → Let one version "win", manually re-add missing nodes

### Resource Conflicts (.tres)

- Usually safe to merge in text editor
- Watch for `uid://` conflicts - keep one, Godot will regenerate if needed

### Script Conflicts (.gd)

- Standard code merge - resolve like any source file

### When in Doubt

1. Keep both versions as separate files temporarily
2. Open in Godot to compare visually
3. Reconcile together with teammate
4. Delete the duplicate after merging

---

## Converting Between Binary and Text Formats

### Scene: .scn (binary) ↔ .tscn (text)

**To convert binary to text:**
1. Open the .scn scene in Godot
2. File → Save Scene As...
3. Change extension to .tscn
4. Delete the old .scn file

**When to use which:**
- `.tscn` - Scenes you edit frequently, need version control diffs
- `.scn` - Large imported scenes, generated content (smaller file size)

---

## Import Settings Best Practices

### Textures

```
# For 3D PBR textures
Compress Mode: VRAM Compressed
Normal Map: Enable if it's a normal map
Mipmaps: Generate (for 3D)

# For UI/2D sprites
Compress Mode: Lossless
Mipmaps: Disabled
Filter: Nearest (for pixel art) or Linear
```

### 3D Models (.glb, .gltf)

```
# Recommended import settings
Meshes:
  - Generate Lightmap UV2: Enable (if using baked lighting)
  - Generate Tangents: Enable

Materials:
  - External Files: Enable (allows editing materials separately)
```

### Reimporting Assets

If textures or models look wrong after pulling:
1. Select the asset in FileSystem
2. Go to Import tab
3. Click "Reimport"

Or delete `.godot/imported/` folder and restart Godot.

---

## Quick Reference

### File Extensions

| Extension | Type | Format |
|-----------|------|--------|
| `.tscn` | Scene | Text |
| `.scn` | Scene | Binary |
| `.tres` | Resource | Text |
| `.res` | Resource | Binary |
| `.gd` | GDScript | Text |
| `.gdshader` | Shader | Text |
| `.import` | Import config | Text |

### Common Paths

```gdscript
# Get paths in code
var project_path = ProjectSettings.globalize_path("res://")
var user_path = OS.get_user_data_dir()  # For save files

# Load resources
var scene = preload("res://scenes/player/player.tscn")
var resource = load("res://resources/items/sword.tres")
```

### Useful Editor Shortcuts

| Action | Shortcut |
|--------|----------|
| Save Scene | Ctrl+S |
| Save All | Ctrl+Shift+S |
| Run Project | F5 |
| Run Current Scene | F6 |
| Search Files | Ctrl+Shift+O |
| Search in Files | Ctrl+Shift+F |
| Toggle FileSystem | Ctrl+1 |
| Toggle Scene Tree | Ctrl+2 |
