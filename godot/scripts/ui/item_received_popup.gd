extends CanvasLayer
class_name ItemReceivedPopup

@onready var popup_panel: Control = $PopupPanel
@onready var item_viewport: SubViewport = $PopupPanel/SubViewportContainer/SubViewport
@onready var item_holder: Node3D = $PopupPanel/SubViewportContainer/SubViewport/ItemHolder
@onready var item_label: Label = $PopupPanel/ItemLabel
@onready var animation_player: AnimationPlayer = $AnimationPlayer

var _rotation_speed: float = 1.0


func _ready() -> void:
	popup_panel.visible = false
	InventoryManager.item_added.connect(_on_item_added)


func _process(delta: float) -> void:
	if popup_panel.visible and item_holder:
		item_holder.rotate_y(delta * _rotation_speed)


func _on_item_added(item_id: String) -> void:
	show_item(item_id)


func show_item(item_id: String) -> void:
	# Clear previous item
	for child in item_holder.get_children():
		child.queue_free()
	
	# Load the appropriate model
	var model_path := _get_model_path(item_id)
	if ResourceLoader.exists(model_path):
		var model_scene: PackedScene = load(model_path)
		var model: Node3D = model_scene.instantiate()
		model.scale = Vector3(3, 3, 3)
		item_holder.add_child(model)
	
	# Set label
	item_label.text = _get_item_name(item_id)
	
	# Show popup
	popup_panel.visible = true
	if animation_player:
		animation_player.play("show")
	
	# Auto-hide after delay
	await get_tree().create_timer(3.0).timeout
	hide_popup()


func hide_popup() -> void:
	if animation_player:
		animation_player.play("hide")
		await animation_player.animation_finished
	popup_panel.visible = false


func _get_model_path(item_id: String) -> String:
	match item_id:
		"holiday_gift":
			return "res://assets/models/present-a-cube.glb"
		_:
			return ""


func _get_item_name(item_id: String) -> String:
	match item_id:
		"holiday_gift":
			return "Cadeau reçu!"
		_:
			return "Item reçu!"

