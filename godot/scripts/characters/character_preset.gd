@tool
extends Resource
class_name CharacterPreset

## A reusable resource for defining character appearances ("skins")
## Can be saved as .tres files or created from dictionaries at runtime

@export var preset_name: String = "Default"

@export_group("Body")
@export_range(0, 9) var skin_tone: int = 0
@export_range(0, 14) var face: int = 0
@export_range(0, 10) var eye_color: int = 0

@export_group("Hair")
@export_range(0, 8) var hair: int = 1
@export_range(0, 20) var hair_color: int = 0

@export_group("Clothing")
@export_range(0, 8) var top: int = 1
@export_range(0, 15) var top_variant: int = 0
@export_range(0, 6) var bottom: int = 3
@export_range(0, 5) var bottom_variant: int = 0
@export_range(0, 8) var shoes: int = 2
@export_range(0, 3) var shoes_variant: int = 0

@export_group("Accessories")
@export_range(0, 12) var hat: int = 0
@export_range(0, 7) var hat_variant: int = 0
@export_range(0, 5) var glasses: int = 0
@export_range(0, 2) var glasses_variant: int = 0
@export_range(0, 1) var neck: int = 0
@export_range(0, 0) var neck_variant: int = 0


## Convert preset to dictionary for ModularCharacter.load_from_dict()
func to_dict() -> Dictionary:
	return {
		"SkinTone": skin_tone,
		"Face": face,
		"EyeColor": eye_color,
		"Hair": hair,
		"HairColor": hair_color,
		"Top": top,
		"TopVariant": top_variant,
		"Bottom": bottom,
		"BottomVariant": bottom_variant,
		"Shoes": shoes,
		"ShoesVariant": shoes_variant,
		"Hat": hat,
		"HatVariant": hat_variant,
		"Glasses": glasses,
		"GlassesVariant": glasses_variant,
		"Neck": neck,
		"NeckVariant": neck_variant,
	}


## Load preset from dictionary
func from_dict(data: Dictionary) -> void:
	skin_tone = data.get("SkinTone", 0)
	face = data.get("Face", 0)
	eye_color = data.get("EyeColor", 0)
	hair = data.get("Hair", 1)
	hair_color = data.get("HairColor", 0)
	top = data.get("Top", 1)
	top_variant = data.get("TopVariant", 0)
	bottom = data.get("Bottom", 3)
	bottom_variant = data.get("BottomVariant", 0)
	shoes = data.get("Shoes", 2)
	shoes_variant = data.get("ShoesVariant", 0)
	hat = data.get("Hat", 0)
	hat_variant = data.get("HatVariant", 0)
	glasses = data.get("Glasses", 0)
	glasses_variant = data.get("GlassesVariant", 0)
	neck = data.get("Neck", 0)
	neck_variant = data.get("NeckVariant", 0)


## Create a preset from a dictionary (static factory)
static func create_from_dict(data: Dictionary, name: String = "Custom") -> CharacterPreset:
	var preset := CharacterPreset.new()
	preset.preset_name = name
	preset.from_dict(data)
	return preset


## Create a randomized preset
static func create_random(name: String = "Random") -> CharacterPreset:
	var preset := CharacterPreset.new()
	preset.preset_name = name
	preset.skin_tone = randi() % 10
	preset.face = randi() % 15
	preset.eye_color = randi() % 11
	preset.hair = randi() % 9
	preset.hair_color = randi() % 21
	preset.top = randi() % 9
	preset.bottom = randi() % 7
	preset.shoes = randi() % 9
	preset.hat = 0  # Usually no hat
	preset.glasses = 0  # Usually no glasses
	preset.neck = 0  # Usually no neck accessory
	return preset
