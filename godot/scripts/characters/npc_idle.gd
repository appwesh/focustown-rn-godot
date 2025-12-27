extends Node3D
class_name NPCIdle

## Idle bobbing animation for NPCs

@export var bob_speed: float = 2.5
@export var bob_amount: float = 0.06
@export var sway_speed: float = 1.5
@export var sway_amount: float = 0.02

var _bob_time: float = 0.0
var _base_position: Vector3


func _ready() -> void:
	# Randomize start time so NPCs don't bob in sync
	_bob_time = randf() * TAU
	_base_position = position


func _process(delta: float) -> void:
	_bob_time += delta
	
	# Vertical bob
	var bob_y: float = sin(_bob_time * bob_speed) * bob_amount
	
	# Slight horizontal sway
	var sway_x: float = sin(_bob_time * sway_speed) * sway_amount
	
	position = _base_position + Vector3(sway_x, bob_y, 0)

