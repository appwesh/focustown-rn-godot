extends Control
class_name CharacterCustomizationUI

## Character customization screen for CozyLife assets
## Split view with 3D preview and category-based part selection

signal customization_confirmed(data: Dictionary)
signal customization_cancelled

const ROTATION_SPEED := 2.0

@onready var modular_character: ModularCharacter = $HSplitContainer/LeftPanel/SubViewportContainer/SubViewport/CharacterScene/ModularCharacter
@onready var category_tabs: TabContainer = $HSplitContainer/RightPanel/MainPanel/VBoxContainer/CategoryTabs
@onready var part_grid: GridContainer = $HSplitContainer/RightPanel/MainPanel/VBoxContainer/PartSelection/ScrollContainer/PartGrid
@onready var part_name_label: Label = $HSplitContainer/RightPanel/MainPanel/VBoxContainer/PartSelection/PartNameLabel
@onready var current_part_label: Label = $HSplitContainer/RightPanel/MainPanel/VBoxContainer/PartSelection/CurrentPartLabel
@onready var animation_list: ItemList = $HSplitContainer/RightPanel/AnimationPanel/VBoxContainer/AnimationList
@onready var confirm_button: Button = $HSplitContainer/RightPanel/ButtonPanel/ConfirmButton
@onready var randomize_button: Button = $HSplitContainer/RightPanel/ButtonPanel/RandomizeButton
@onready var cancel_button: Button = $HSplitContainer/RightPanel/ButtonPanel/CancelButton
@onready var rotate_left_btn: Button = $HSplitContainer/LeftPanel/RotateButtons/RotateLeftBtn
@onready var rotate_right_btn: Button = $HSplitContainer/LeftPanel/RotateButtons/RotateRightBtn

var _current_part_category: String = "Hair"
var _part_buttons: Array[Button] = []
var _rotating: int = 0


func _ready() -> void:
	await get_tree().process_frame
	_setup_category_tabs()
	_setup_buttons()
	_setup_animation_list()
	_on_tab_changed(0)
	
	# Show the character after setup
	if modular_character:
		modular_character.show_character()


func _process(delta: float) -> void:
	if _rotating != 0 and modular_character:
		modular_character.rotate_y(_rotating * ROTATION_SPEED * delta)


func _setup_category_tabs() -> void:
	# Clear placeholder tabs
	for child in category_tabs.get_children():
		child.queue_free()
	
	await get_tree().process_frame
	
	# Create tabs for each UI category
	for ui_category_name in ModularCharacter.UI_CATEGORIES.keys():
		var tab := VBoxContainer.new()
		tab.name = ui_category_name
		category_tabs.add_child(tab)
		
		var part_categories: Array = ModularCharacter.UI_CATEGORIES[ui_category_name]
		for part_cat in part_categories:
			var btn := Button.new()
			btn.text = ModularCharacter.PART_DISPLAY_NAMES.get(part_cat, part_cat)
			btn.custom_minimum_size = Vector2(0, 40)
			btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			btn.pressed.connect(_on_part_category_selected.bind(part_cat))
			tab.add_child(btn)
	
	category_tabs.tab_changed.connect(_on_tab_changed)


func _setup_buttons() -> void:
	if confirm_button:
		confirm_button.pressed.connect(_on_confirm_pressed)
	if randomize_button:
		randomize_button.pressed.connect(_on_randomize_pressed)
	if cancel_button:
		cancel_button.pressed.connect(_on_cancel_pressed)
	
	if rotate_left_btn:
		rotate_left_btn.button_down.connect(func(): _rotating = -1)
		rotate_left_btn.button_up.connect(func(): _rotating = 0)
	if rotate_right_btn:
		rotate_right_btn.button_down.connect(func(): _rotating = 1)
		rotate_right_btn.button_up.connect(func(): _rotating = 0)


func _setup_animation_list() -> void:
	if not animation_list or not modular_character:
		return
	
	animation_list.clear()
	
	var categories := modular_character.get_animation_categories()
	for category_name in categories.keys():
		var header_idx := animation_list.add_item("━━ %s ━━" % category_name)
		animation_list.set_item_disabled(header_idx, true)
		animation_list.set_item_selectable(header_idx, false)
		
		var anims: Array = categories[category_name]
		for anim_name in anims:
			var display_name: String = anim_name.replace("_", " ")
			var idx := animation_list.add_item("  " + display_name)
			animation_list.set_item_metadata(idx, anim_name)
	
	animation_list.item_selected.connect(_on_animation_selected)


func _select_part_category(part_category: String) -> void:
	_current_part_category = part_category
	
	if part_name_label:
		part_name_label.text = ModularCharacter.PART_DISPLAY_NAMES.get(part_category, part_category)
	
	_update_part_grid()


func _update_part_grid() -> void:
	# Clear existing
	for btn in _part_buttons:
		if is_instance_valid(btn):
			btn.queue_free()
	_part_buttons.clear()
	
	if not modular_character:
		return
	
	var max_count := modular_character.get_part_count(_current_part_category)
	var current_index := modular_character.get_part(_current_part_category)
	
	if max_count == 0:
		var label := Label.new()
		# For variant categories, show a more helpful message
		if _current_part_category.ends_with("Variant"):
			var base_cat := _current_part_category.replace("Variant", "")
			label.text = "Select a %s first" % base_cat.to_lower()
		else:
			label.text = "No options"
		part_grid.add_child(label)
		return
	
	# Create part buttons
	for i in range(max_count):
		var part_name := modular_character.get_part_name(_current_part_category, i)
		var btn := _create_part_button(part_name, i, i == current_index)
		part_grid.add_child(btn)
		_part_buttons.append(btn)
	
	_update_current_label()


func _create_part_button(text: String, index: int, selected: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(80, 50)
	btn.toggle_mode = true
	btn.button_pressed = selected
	btn.pressed.connect(_on_part_selected.bind(index))
	
	if selected:
		btn.add_theme_color_override("font_color", Color(0.2, 0.8, 0.4))
	
	return btn


func _update_button_selection(selected_index: int) -> void:
	for i in range(_part_buttons.size()):
		var btn := _part_buttons[i]
		if is_instance_valid(btn):
			btn.button_pressed = (i == selected_index)
			if i == selected_index:
				btn.add_theme_color_override("font_color", Color(0.2, 0.8, 0.4))
			else:
				btn.remove_theme_color_override("font_color")


func _update_current_label() -> void:
	if current_part_label and modular_character:
		var index := modular_character.get_part(_current_part_category)
		var name := modular_character.get_part_name(_current_part_category, index)
		current_part_label.text = "Current: %s" % name


## Event Handlers

func _on_tab_changed(tab_index: int) -> void:
	var ui_category_names := ModularCharacter.UI_CATEGORIES.keys()
	if tab_index >= ui_category_names.size():
		return
	
	var ui_category_name: String = ui_category_names[tab_index]
	var part_categories: Array = ModularCharacter.UI_CATEGORIES[ui_category_name]
	
	if part_categories.size() > 0:
		_select_part_category(part_categories[0])


func _on_part_category_selected(part_category: String) -> void:
	_select_part_category(part_category)


func _on_part_selected(index: int) -> void:
	if modular_character:
		modular_character.set_part(_current_part_category, index)
	_update_button_selection(index)
	_update_current_label()


func _on_animation_selected(index: int) -> void:
	if not animation_list or not modular_character:
		return
	
	var anim_name: Variant = animation_list.get_item_metadata(index)
	if anim_name:
		modular_character.play_animation(str(anim_name))


func _on_confirm_pressed() -> void:
	if modular_character:
		var customization_data := modular_character.save_to_dict()
		print(customization_data)
		customization_confirmed.emit(customization_data)


func _on_randomize_pressed() -> void:
	if modular_character:
		modular_character.randomize_appearance()
		_update_part_grid()


func _on_cancel_pressed() -> void:
	customization_cancelled.emit()


## Public API

func get_customization_data() -> Dictionary:
	return modular_character.save_to_dict() if modular_character else {}


func set_customization_data(data: Dictionary) -> void:
	if modular_character:
		modular_character.load_from_dict(data)
		_update_part_grid()
