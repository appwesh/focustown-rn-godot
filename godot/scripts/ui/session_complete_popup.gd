extends Control
## Popup that shows when a focus session ends

@onready var duration_label: Label = $Panel/VBox/DurationLabel
@onready var coins_label: Label = $Panel/VBox/CoinsLabel
@onready var panel: Panel = $Panel

var _tween: Tween


func _ready() -> void:
	visible = false
	FocusSessionManager.session_ended.connect(_on_session_ended)


func _on_session_ended(duration_seconds: int, coins_earned: int) -> void:
	# Format duration
	var mins := duration_seconds / 60
	var secs := duration_seconds % 60
	duration_label.text = "Focus time: %d:%02d" % [mins, secs]
	
	# Show coins
	if coins_earned > 0:
		coins_label.text = "+%d coins!" % coins_earned
	else:
		coins_label.text = "Too short for coins"
	
	# Animate in
	_show_popup()


func _show_popup() -> void:
	visible = true
	modulate.a = 0
	panel.scale = Vector2(0.8, 0.8)
	
	if _tween:
		_tween.kill()
	_tween = create_tween()
	_tween.set_parallel(true)
	_tween.tween_property(self, "modulate:a", 1.0, 0.3)
	_tween.tween_property(panel, "scale", Vector2(1, 1), 0.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	
	# Auto-hide after 3 seconds
	await get_tree().create_timer(3.0).timeout
	_hide_popup()


func _hide_popup() -> void:
	if _tween:
		_tween.kill()
	_tween = create_tween()
	_tween.tween_property(self, "modulate:a", 0.0, 0.3)
	_tween.tween_callback(func(): visible = false)

