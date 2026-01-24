extends RefCounted
class_name CharacterPresets

## Collection of predefined character presets (skins)
## Use these for NPCs, cinematics, or as starting points for customization

## Predefined character presets as dictionaries
## Each preset defines a complete character appearance

const PRESETS := {
	"librarian": {
		"SkinTone": 2,
		"Face": 3,
		"EyeColor": 4,  # Green
		"Hair": 4,  # MessyKnotBun
		"HairColor": 5,  # DarkBrown
		"Top": 3,  # Sweater
		"Bottom": 4,  # SkinnyPants
		"Shoes": 2,  # Oxfords
		"Hat": 0,  # None
		"Glasses": 1,  # Round
	},
	
	"student": {
		"SkinTone": 4,
		"Face": 7,
		"EyeColor": 1,  # Blue
		"Hair": 2,  # BabyBangs
		"HairColor": 2,  # Blonde
		"Top": 1,  # Tank
		"Bottom": 2,  # Shorts
		"Shoes": 1,  # CrewSocks
		"Hat": 0,
		"Glasses": 0,
	},
	
	"wizard": {
		"SkinTone": 8,
		"Face": 11,
		"EyeColor": 8,  # Teal
		"Hair": 3,  # LongWavy
		"HairColor": 7,  # Gray
		"Top": 6,  # WizardRobe
		"Bottom": 5,  # FlarePants
		"Shoes": 6,  # WizardBoots
		"Hat": 8,  # Viking (closest to wizard hat)
		"Glasses": 0,
	},
	
	"adventurer": {
		"SkinTone": 5,
		"Face": 5,
		"EyeColor": 3,  # Green
		"Hair": 6,  # Mullet
		"HairColor": 11,  # LightBrown
		"Top": 5,  # WarriorTunic
		"Bottom": 3,  # Pants
		"Shoes": 5,  # WarriorBoots
		"Hat": 0,
		"Glasses": 0,
	},
	
	"farmer": {
		"SkinTone": 6,
		"Face": 2,
		"EyeColor": 4,  # Green
		"Hair": 5,  # MessySpiky
		"HairColor": 10,  # Ginger
		"Top": 2,  # LongSleeve
		"Bottom": 3,  # Pants
		"Shoes": 4,  # RainBoots
		"Hat": 7,  # StrawHat
		"Glasses": 0,
	},
	
	"hipster": {
		"SkinTone": 3,
		"Face": 9,
		"EyeColor": 5,  # LightBrown
		"Hair": 8,  # WavyMiddlePart
		"HairColor": 0,  # Default
		"Top": 3,  # Sweater
		"Bottom": 4,  # SkinnyPants
		"Shoes": 3,  # ChunkyBoots
		"Hat": 2,  # Fisherman
		"Glasses": 3,  # CatEye
	},
	
	"punk": {
		"SkinTone": 1,
		"Face": 14,
		"EyeColor": 9,  # White
		"Hair": 5,  # MessySpiky
		"HairColor": 15,  # Red
		"Top": 1,  # Tank
		"Bottom": 4,  # SkinnyPants
		"Shoes": 3,  # ChunkyBoots
		"Hat": 0,
		"Glasses": 5,  # HeartSunglasses
	},
	
	"elegant": {
		"SkinTone": 7,
		"Face": 12,
		"EyeColor": 6,  # Pink
		"Hair": 3,  # LongWavy
		"HairColor": 0,  # Default (black)
		"Top": 4,  # PuffSleeveDress
		"Bottom": 6,  # Skirt
		"Shoes": 2,  # Oxfords
		"Hat": 0,
		"Glasses": 0,
	},
	
	"cozy_reader": {
		"SkinTone": 0,
		"Face": 1,
		"EyeColor": 2,  # DarkBrown
		"Hair": 7,  # StarBuns
		"HairColor": 13,  # PastelPink
		"Top": 3,  # Sweater
		"Bottom": 5,  # FlarePants
		"Shoes": 1,  # CrewSocks
		"Hat": 0,
		"Glasses": 1,  # Round
	},
	
	"party_goer": {
		"SkinTone": 9,
		"Face": 8,
		"EyeColor": 7,  # Purple
		"Hair": 4,  # Afro
		"HairColor": 9,  # Holo
		"Top": 1,  # Tank
		"Bottom": 6,  # Skirt
		"Shoes": 3,  # ChunkyBoots
		"Hat": 3,  # PartyHat
		"Glasses": 5,  # HeartSunglasses
	},
}


## Get a preset by name
static func get_preset(preset_name: String) -> Dictionary:
	return PRESETS.get(preset_name.to_lower(), {})


## Get a preset as CharacterPreset resource
static func get_preset_resource(preset_name: String) -> CharacterPreset:
	var data := get_preset(preset_name)
	if data.is_empty():
		return null
	return CharacterPreset.create_from_dict(data, preset_name.capitalize())


## Get all available preset names
static func get_preset_names() -> Array[String]:
	var names: Array[String] = []
	names.assign(PRESETS.keys())
	return names


## Get a random preset
static func get_random_preset() -> Dictionary:
	var keys := PRESETS.keys()
	return PRESETS[keys[randi() % keys.size()]]


## Get a random preset as CharacterPreset resource
static func get_random_preset_resource() -> CharacterPreset:
	var keys := PRESETS.keys()
	var key: String = keys[randi() % keys.size()]
	return get_preset_resource(key)
