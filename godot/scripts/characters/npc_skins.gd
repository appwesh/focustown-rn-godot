extends RefCounted
class_name NPCSkins

## Curated NPC character skins for random assignment
## These are coherent outfit/appearance combinations designed to look good together

## 25 curated NPC skins with diverse, visually coherent combinations
const SKINS := [
	# 1. Casual Academic - A studious type with warm tones
	{
		"name": "casual_academic",
		"SkinTone": 3,
		"Face": 2,
		"EyeColor": 2,  # DarkBrown
		"Hair": 8,  # WavyMiddlePart
		"HairColor": 5,  # DarkBrown
		"Top": 3,  # Sweater
		"Bottom": 4,  # SkinnyPants
		"Shoes": 2,  # Oxfords
		"Hat": 0,  # None
		"Glasses": 1,  # Round
	},
	
	# 2. Trendy Creative - Colorful and expressive
	{
		"name": "trendy_creative",
		"SkinTone": 6,
		"Face": 8,
		"EyeColor": 8,  # Teal
		"Hair": 7,  # StarBuns
		"HairColor": 12,  # PastelPink
		"Top": 1,  # Tank
		"Bottom": 5,  # FlarePants
		"Shoes": 3,  # ChunkyBoots
		"Hat": 0,  # None
		"Glasses": 3,  # CatEye
	},
	
	# 3. Cozy Bookworm - Warm, comfortable look
	{
		"name": "cozy_bookworm",
		"SkinTone": 1,
		"Face": 5,
		"EyeColor": 3,  # Green
		"Hair": 4,  # MessyKnotBun
		"HairColor": 6,  # Ginger
		"Top": 3,  # Sweater
		"Bottom": 5,  # FlarePants
		"Shoes": 1,  # CrewSocks
		"Hat": 0,  # None
		"Glasses": 0,  # None
	},
	
	# 4. Classic Professional - Clean and polished
	{
		"name": "classic_professional",
		"SkinTone": 8,
		"Face": 10,
		"EyeColor": 2,  # DarkBrown
		"Hair": 2,  # BabyBangs
		"HairColor": 1,  # Black
		"Top": 2,  # LongSleeve
		"Bottom": 3,  # Pants
		"Shoes": 2,  # Oxfords
		"Hat": 0,  # None
		"Glasses": 2,  # Aviator
	},
	
	# 5. Artsy Bohemian - Free-spirited look
	{
		"name": "artsy_bohemian",
		"SkinTone": 4,
		"Face": 12,
		"EyeColor": 4,  # LightBrown
		"Hair": 3,  # LongWavy
		"HairColor": 10,  # LightBrown
		"Top": 4,  # PuffSleeveDress
		"Bottom": 6,  # Skirt
		"Shoes": 3,  # ChunkyBoots
		"Hat": 0,  # None
		"Glasses": 0,  # None
	},
	
	# 6. Urban Cool - Modern street style
	{
		"name": "urban_cool",
		"SkinTone": 7,
		"Face": 4,
		"EyeColor": 1,  # Blue
		"Hair": 5,  # MessySpiky
		"HairColor": 2,  # Blonde
		"Top": 1,  # Tank
		"Bottom": 4,  # SkinnyPants
		"Shoes": 3,  # ChunkyBoots
		"Hat": 0,  # None
		"Glasses": 4,  # CatEyeSunglasses
	},
	
	# 7. Gentle Scholar - Soft and approachable
	{
		"name": "gentle_scholar",
		"SkinTone": 2,
		"Face": 1,
		"EyeColor": 3,  # Green
		"Hair": 1,  # Afro
		"HairColor": 5,  # DarkBrown
		"Top": 3,  # Sweater
		"Bottom": 3,  # Pants
		"Shoes": 2,  # Oxfords
		"Hat": 0,  # None
		"Glasses": 1,  # Round
	},
	
	# 8. Vibrant Spirit - Bold and energetic
	{
		"name": "vibrant_spirit",
		"SkinTone": 5,
		"Face": 7,
		"EyeColor": 6,  # Purple
		"Hair": 6,  # Mullet
		"HairColor": 14,  # Purple
		"Top": 2,  # LongSleeve
		"Bottom": 2,  # Shorts
		"Shoes": 1,  # CrewSocks
		"Hat": 0,  # None
		"Glasses": 0,  # None
	},
	
	# 9. Refined Elegant - Sophisticated look
	{
		"name": "refined_elegant",
		"SkinTone": 9,
		"Face": 13,
		"EyeColor": 5,  # Pink
		"Hair": 3,  # LongWavy
		"HairColor": 1,  # Black
		"Top": 4,  # PuffSleeveDress
		"Bottom": 4,  # SkinnyPants
		"Shoes": 2,  # Oxfords
		"Hat": 0,  # None
		"Glasses": 0,  # None
	},
	
	# 10. Relaxed Casual - Easy-going vibe
	{
		"name": "relaxed_casual",
		"SkinTone": 0,
		"Face": 6,
		"EyeColor": 1,  # Blue
		"Hair": 8,  # WavyMiddlePart
		"HairColor": 2,  # Blonde
		"Top": 2,  # LongSleeve
		"Bottom": 3,  # Pants
		"Shoes": 1,  # CrewSocks
		"Hat": 0,  # None
		"Glasses": 0,  # None
	},
	
	# 11. Cool Wizard - Mystical style (user inspired)
	{
		"name": "cool_wizard",
		"SkinTone": 1,
		"Face": 3,
		"EyeColor": 1,  # Blue
		"Hair": 4,  # MessyKnotBun
		"HairColor": 19,  # White
		"Top": 6,  # WizardRobe
		"Bottom": 3,  # Pants
		"Shoes": 6,  # WizardBoots
		"Hat": 0,  # None
		"Glasses": 0,
	},
	
	# 12. Rainy Day - Practical layers
	{
		"name": "rainy_day",
		"SkinTone": 4,
		"Face": 0,
		"EyeColor": 4,  # LightBrown
		"Hair": 2,  # BabyBangs
		"HairColor": 10,  # LightBrown
		"Top": 2,  # LongSleeve
		"Bottom": 3,  # Pants
		"Shoes": 4,  # RainBoots
		"Hat": 2,  # Fisherman
		"Glasses": 0,
	},
	
	# 13. Weekend Wanderer - Casual tunic
	{
		"name": "weekend_wanderer",
		"SkinTone": 7,
		"Face": 11,
		"EyeColor": 1,  # Blue
		"Hair": 3,  # LongWavy
		"HairColor": 7,  # Gray
		"Top": 5,  # WarriorTunic
		"Bottom": 3,  # Pants
		"Shoes": 5,  # WarriorBoots
		"Hat": 1,  # Cowboy
		"Glasses": 0,
	},
	
	# 14. Studio Intern - Neat and minimal
	{
		"name": "studio_intern",
		"SkinTone": 2,
		"Face": 3,
		"EyeColor": 2,  # DarkBrown
		"Hair": 8,  # WavyMiddlePart
		"HairColor": 5,  # DarkBrown
		"Top": 2,  # LongSleeve
		"Bottom": 4,  # SkinnyPants
		"Shoes": 2,  # Oxfords
		"Hat": 0,
		"Glasses": 1,  # Round
	},
	
	# 15. Creative Director - Strong silhouette
	{
		"name": "creative_director",
		"SkinTone": 8,
		"Face": 14,
		"EyeColor": 2,  # DarkBrown
		"Hair": 1,  # Afro
		"HairColor": 1,  # Black
		"Top": 3,  # Sweater
		"Bottom": 4,  # SkinnyPants
		"Shoes": 2,  # Oxfords
		"Hat": 5,  # PorkPie
		"Glasses": 2,  # Aviator
	},
	
	# 16. Quiet Coder - Soft tones
	{
		"name": "quiet_coder",
		"SkinTone": 1,
		"Face": 0,
		"EyeColor": 2,  # DarkBrown
		"Hair": 4,  # MessyKnotBun
		"HairColor": 5,  # DarkBrown
		"Top": 3,  # Sweater
		"Bottom": 3,  # Pants
		"Shoes": 1,  # CrewSocks
		"Hat": 0,
		"Glasses": 1,  # Round
	},
	
	# 17. Morning Reader - Light layers
	{
		"name": "morning_reader",
		"SkinTone": 0,
		"Face": 4,
		"EyeColor": 4,  # LightBrown
		"Hair": 2,  # BabyBangs
		"HairColor": 2,  # Blonde
		"Top": 1,  # Tank
		"Bottom": 6,  # Skirt
		"Shoes": 1,  # CrewSocks
		"Hat": 7,  # StrawHat
		"Glasses": 0,
	},
	
	# 18. Warm Scholar - Cozy earth tones
	{
		"name": "warm_scholar",
		"SkinTone": 3,
		"Face": 6,
		"EyeColor": 4,  # LightBrown
		"Hair": 6,  # Mullet
		"HairColor": 10,  # LightBrown
		"Top": 3,  # Sweater
		"Bottom": 3,  # Pants
		"Shoes": 2,  # Oxfords
		"Hat": 0,
		"Glasses": 1,  # Round
	},
	
	# 19. Cafe Regular - Simple and clean
	{
		"name": "cafe_regular",
		"SkinTone": 5,
		"Face": 7,
		"EyeColor": 2,  # DarkBrown
		"Hair": 5,  # MessySpiky
		"HairColor": 5,  # DarkBrown
		"Top": 2,  # LongSleeve
		"Bottom": 4,  # SkinnyPants
		"Shoes": 2,  # Oxfords
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 20. Winter Walk - Cozy boots
	{
		"name": "winter_walk",
		"SkinTone": 5,
		"Face": 9,
		"EyeColor": 2,  # DarkBrown
		"Hair": 3,  # LongWavy
		"HairColor": 7,  # Gray
		"Top": 3,  # Sweater
		"Bottom": 3,  # Pants
		"Shoes": 4,  # RainBoots
		"Hat": 8,  # Viking
		"Glasses": 0,
	},
	
	# 21. Afternoon Artist - Soft pastels
	{
		"name": "afternoon_artist",
		"SkinTone": 4,
		"Face": 11,
		"EyeColor": 4,  # LightBrown
		"Hair": 7,  # StarBuns
		"HairColor": 12,  # PastelPink
		"Top": 3,  # Sweater
		"Bottom": 5,  # FlarePants
		"Shoes": 3,  # ChunkyBoots
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 22. Retro Gamer - Dark neutral
	{
		"name": "retro_gamer",
		"SkinTone": 7,
		"Face": 0,
		"EyeColor": 1,  # Blue
		"Hair": 8,  # WavyMiddlePart
		"HairColor": 1,  # Black
		"Top": 2,  # LongSleeve
		"Bottom": 4,  # SkinnyPants
		"Shoes": 2,  # Oxfords
		"Hat": 0,
		"Glasses": 2,  # Aviator
	},
	
	# 23. Soft Librarian - Gentle tones
	{
		"name": "soft_librarian",
		"SkinTone": 6,
		"Face": 13,
		"EyeColor": 2,  # DarkBrown
		"Hair": 4,  # MessyKnotBun
		"HairColor": 10,  # LightBrown
		"Top": 3,  # Sweater
		"Bottom": 5,  # FlarePants
		"Shoes": 1,  # CrewSocks
		"Hat": 0,
		"Glasses": 1,  # Round
	},
	
	# 24. Sunny Student - Warm and friendly
	{
		"name": "sunny_student",
		"SkinTone": 2,
		"Face": 14,
		"EyeColor": 3,  # Green
		"Hair": 1,  # Afro
		"HairColor": 5,  # DarkBrown
		"Top": 1,  # Tank
		"Bottom": 2,  # Shorts
		"Shoes": 1,  # CrewSocks
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 25. Night Owl - Dark and calm
	{
		"name": "night_owl",
		"SkinTone": 7,
		"Face": 9,
		"EyeColor": 2,  # DarkBrown
		"Hair": 2,  # BabyBangs
		"HairColor": 1,  # Black
		"Top": 3,  # Sweater
		"Bottom": 4,  # SkinnyPants
		"Shoes": 3,  # ChunkyBoots
		"Hat": 0,
		"Glasses": 2,  # Aviator
	},
]


## Get a random NPC skin
static func get_random_skin() -> Dictionary:
	return SKINS[randi() % SKINS.size()].duplicate()


## Get a random NPC skin as CharacterPreset resource
static func get_random_skin_resource() -> CharacterPreset:
	var skin := get_random_skin()
	var name: String = skin.get("name", "npc")
	return CharacterPreset.create_from_dict(skin, name.capitalize().replace("_", " "))


## Get a skin by index (0-9)
static func get_skin(index: int) -> Dictionary:
	if index < 0 or index >= SKINS.size():
		return SKINS[0].duplicate()
	return SKINS[index].duplicate()


## Get a skin by name
static func get_skin_by_name(skin_name: String) -> Dictionary:
	for skin in SKINS:
		if skin.get("name", "") == skin_name:
			return skin.duplicate()
	return {}


## Get all skin names
static func get_skin_names() -> Array[String]:
	var names: Array[String] = []
	for skin in SKINS:
		names.append(skin.get("name", "unknown"))
	return names


## Get total number of skins
static func get_skin_count() -> int:
	return SKINS.size()


## Get multiple unique random skins (no duplicates)
static func get_unique_random_skins(count: int) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	var indices := get_unique_random_indices(count)
	
	for idx in indices:
		result.append(SKINS[idx].duplicate())
	
	return result


## Get multiple unique random skin indices (no duplicates)
static func get_unique_random_indices(count: int) -> Array[int]:
	var available_indices: Array[int] = []
	
	for i in range(SKINS.size()):
		available_indices.append(i)
	
	# Shuffle available indices
	available_indices.shuffle()
	
	# Take the requested count (or all if count > available)
	var take_count := mini(count, available_indices.size())
	var result: Array[int] = []
	for i in range(take_count):
		result.append(available_indices[i])
	
	return result
