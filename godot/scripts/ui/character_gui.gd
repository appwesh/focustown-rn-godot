extends Control
class_name CharacterGUI

## Character GUI with hair style picker
## Displays main character preview and scrollable grid of all 10 hairstyles

const HAIR_PREVIEW_CELL := preload("res://scenes/ui/hair_preview_cell.tscn")

const BG_COLOR := Color("#D4E9F7")  # Light blue background
const PANEL_COLOR := Color("#F5E6D3")  # Beige panel
const CELL_COLOR := Color("#F8EEE0")  # Lighter beige for cells
const TAB_UNSELECTED := Color("#E8DCC8")  # Tab unselected
const TAB_SELECTED := Color("#D4C4A8")  # Tab selected (darker)
const COIN_BG := Color("#FFFFFF")  # White coin pill
const CORNER_RADIUS := 16
const CELL_CORNER_RADIUS := 12

@onready var main_character: ModularCharacter = %MainCharacter
@onready var hair_grid: GridContainer = %HairGrid

var _hair_cells: Array[PanelContainer] = []


func _ready() -> void:
	_setup_main_character()
	_setup_hair_grid()


func _setup_main_character() -> void:
	if not main_character:
		return

	# Configure main character with default appearance
	main_character.load_from_dict({
		"SkinTone": 1,
		"Face": 1,
		"EyeColor": 0,
		"Hair": 1,
		"HairColor": 0,
		"Top": 1,
		"Bottom": 3,
		"Shoes": 2,
		"Hat": 0,
		"Glasses": 0,
	})

	# Play idle animation
	main_character.play_animation("Idle_F")


func _setup_hair_grid() -> void:
	if not hair_grid:
		return

	# Clear any existing children
	for child in hair_grid.get_children():
		child.queue_free()

	_hair_cells.clear()

	# Create 10 hair preview cells (hair indices 1-10)
	for hair_index in range(1, 11):
		var cell := HAIR_PREVIEW_CELL.instantiate() as PanelContainer
		hair_grid.add_child(cell)
		_hair_cells.append(cell)

		# Configure the character in this cell to show the specific hairstyle
		# Need to wait for the cell to be ready before accessing its character
		_configure_hair_cell.call_deferred(cell, hair_index)


func _configure_hair_cell(cell: PanelContainer, hair_index: int) -> void:
	# Find the ModularCharacter in the cell's SubViewport
	var viewport := cell.get_node_or_null("SubViewportContainer/SubViewport")
	if not viewport:
		return

	var character := viewport.get_node_or_null("PreviewScene/ModularCharacter") as ModularCharacter
	if not character:
		return

	# Wait for character to be ready
	if not character.is_node_ready():
		await character.ready

	# Configure for hair preview: grey skin, no face, specific hair, no clothes
	character.load_from_dict({
		"SkinTone": 0,  # Grey
		"Face": 0,  # None
		"EyeColor": 0,
		"Hair": hair_index,
		"HairColor": 0,  # Default color
		"Top": 0,  # None
		"Bottom": 0,  # None
		"Shoes": 0,  # None
		"Hat": 0,
		"Glasses": 0,
	})

	# Set to static pose (no animation)
	character.play_animation("Static")

	# Enable items-only mode to hide body below neck
	character.set_items_only_mode(true)
