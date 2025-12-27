extends Node

## Manages game state and initialization


func _ready() -> void:
	# Start the initial quest after a short delay
	await get_tree().create_timer(1.0).timeout
	_start_initial_quest()


func _start_initial_quest() -> void:
	QuestManager.start_quest(
		"buy_gift",
		"Buy a Gift",
		"Visit the bakery and buy a holiday gift",
		[
			{"id": "talk_baker", "text": "Talk to Ginger at the bakery"},
			{"id": "buy_gift", "text": "Buy a gift"}
		]
	)

