extends Node3D

## Baker NPC - French immersion dialog

@onready var interaction_area: Area3D = $InteractionArea

var _has_given_gift: bool = false
var _player_ref: Player = null


func _ready() -> void:
	interaction_area.body_entered.connect(_on_body_entered)
	interaction_area.body_exited.connect(_on_body_exited)


func interact() -> void:
	# Tell camera to focus on this NPC during dialog
	var camera_pivot = get_tree().get_first_node_in_group("camera_pivot")
	if camera_pivot and camera_pivot.has_method("set_dialog_target"):
		camera_pivot.set_dialog_target(self)
	
	# Make player face the NPC
	if _player_ref:
		var dir_to_npc: Vector3 = global_position - _player_ref.global_position
		dir_to_npc.y = 0
		if dir_to_npc.length() > 0.1:
			_player_ref.rotation.y = atan2(dir_to_npc.x, dir_to_npc.z)
	
	# Check quest state
	if _has_given_gift:
		_start_post_gift_dialog()
	elif QuestManager.is_quest_active("buy_gift"):
		_start_french_dialog()
	else:
		_start_default_dialog()


func _start_french_dialog() -> void:
	# Complete the "talk to baker" objective
	QuestManager.complete_objective("buy_gift", "talk_baker")
	
	var dialog_lines: Array = [
		"Bonjour! Bienvenue à la boulangerie!",
		"Je m'appelle Ginger.",
		"Qu'est-ce que vous désirez?",
		{
			"speaker": "Ginger",
			"text": "Vous voulez...?",
			"choices": [
				{"text": "Je voudrais un cadeau, s'il vous plaît", "correct": true},
				{"text": "Je voudrais manger un croissant", "correct": false},
				{"text": "Où sont les toilettes?", "correct": false}
			],
			"callback": _on_first_choice
		}
	]
	
	DialogManager.start_dialog("Ginger", dialog_lines)


func _on_first_choice(choice_index: int) -> void:
	var choices := [
		{"text": "Je voudrais un cadeau, s'il vous plaît", "correct": true},
		{"text": "Je voudrais manger un croissant", "correct": false},
		{"text": "Où sont les toilettes?", "correct": false}
	]
	
	if choices[choice_index]["correct"]:
		_continue_correct_first()
	else:
		_continue_wrong_first(choice_index)


func _continue_correct_first() -> void:
	var dialog_lines: Array = [
		"Ah, un cadeau! Très bien!",
		"J'ai quelque chose de parfait pour vous.",
		"Mais d'abord...",
		{
			"speaker": "Ginger",
			"text": "Ça coûte cinq euros. D'accord?",
			"choices": [
				{"text": "Oui, d'accord!", "correct": true},
				{"text": "Non, c'est trop cher", "correct": false},
				{"text": "Je ne comprends pas", "correct": false}
			],
			"callback": _on_second_choice
		}
	]
	
	DialogManager.start_dialog("Ginger", dialog_lines)


func _continue_wrong_first(choice_index: int) -> void:
	var responses := [
		["Un cadeau? D'accord!", "Je comprends."],  # Won't happen (correct)
		["Un croissant? Hmm...", "Vous cherchez un cadeau, non?", "Essayez encore!"],
		["Les toilettes? Non non!", "Vous cherchez un cadeau!", "Essayez encore!"]
	]
	
	var dialog_lines: Array = []
	for line in responses[choice_index]:
		dialog_lines.append(line)
	
	dialog_lines.append({
		"speaker": "Ginger",
		"text": "Vous voulez...?",
		"choices": [
			{"text": "Je voudrais un cadeau, s'il vous plaît", "correct": true},
			{"text": "Je voudrais manger un croissant", "correct": false},
			{"text": "Où sont les toilettes?", "correct": false}
		],
		"callback": _on_first_choice
	})
	
	DialogManager.start_dialog("Ginger", dialog_lines)


func _on_second_choice(choice_index: int) -> void:
	var choices := [
		{"text": "Oui, d'accord!", "correct": true},
		{"text": "Non, c'est trop cher", "correct": false},
		{"text": "Je ne comprends pas", "correct": false}
	]
	
	if choices[choice_index]["correct"]:
		_give_gift_dialog()
	else:
		_continue_wrong_second(choice_index)


func _continue_wrong_second(choice_index: int) -> void:
	var responses := [
		[],  # Won't happen (correct)
		["Trop cher? Mais non!", "C'est un bon prix pour un cadeau.", "Allez, cinq euros!"],
		["Cinq euros.", "Vous comprenez?", "Cinq. Euros."]
	]
	
	var dialog_lines: Array = []
	for line in responses[choice_index]:
		dialog_lines.append(line)
	
	dialog_lines.append({
		"speaker": "Ginger",
		"text": "Alors, ça coûte cinq euros. D'accord?",
		"choices": [
			{"text": "Oui, d'accord!", "correct": true},
			{"text": "Non, c'est trop cher", "correct": false},
			{"text": "Je ne comprends pas", "correct": false}
		],
		"callback": _on_second_choice
	})
	
	DialogManager.start_dialog("Ginger", dialog_lines)


func _give_gift_dialog() -> void:
	var dialog_lines: Array = [
		"Parfait!",
		"Voici votre cadeau!",
		"Merci beaucoup!",
		"Au revoir et bonne journée!"
	]
	
	DialogManager.start_dialog("Ginger", dialog_lines)
	DialogManager.dialog_ended.connect(_on_gift_dialog_ended, CONNECT_ONE_SHOT)


func _on_gift_dialog_ended() -> void:
	_has_given_gift = true
	InventoryManager.add_item("holiday_gift", 1)
	QuestManager.complete_objective("buy_gift", "buy_gift")


func _start_post_gift_dialog() -> void:
	var dialog_lines: Array = [
		"Bonjour encore!",
		"Comment ça va?",
		"Revenez bientôt!"
	]
	
	DialogManager.start_dialog("Ginger", dialog_lines)


func _start_default_dialog() -> void:
	var dialog_lines: Array = [
		"Bonjour!",
		"Bienvenue à Talktown!",
		"À bientôt!"
	]
	
	DialogManager.start_dialog("Ginger", dialog_lines)


func _on_body_entered(body: Node3D) -> void:
	if body is Player:
		_player_ref = body
		body.set_nearby_interactable(interaction_area)


func _on_body_exited(body: Node3D) -> void:
	if body is Player:
		body.clear_nearby_interactable(interaction_area)
		_player_ref = null
