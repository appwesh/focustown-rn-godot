extends RefCounted
class_name NPCSkins

## Curated NPC character skins for random assignment
## These are coherent outfit/appearance combinations designed to look good together

## 20 curated NPC skins with maximum texture variety
## Each uses unique clothing + color combinations from the full asset pack
const SKINS := [
	# 1. Skull Streetwear - Black skull tee, denim, chucks
	{
		"name": "skull_streetwear",
		"SkinTone": 7,
		"Face": 4,
		"EyeColor": 1,  # Blue
		"Hair": 5,  # MessySpiky
		"HairColor": 2,  # Blonde
		"Top": 7,  # Tshirt
		"TopVariant": 2,  # BlackSkull
		"Bottom": 3,  # Pants
		"BottomVariant": 3,  # Denim
		"Shoes": 8,  # Sneakers
		"ShoesVariant": 1,  # Chucks
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 2. Sakura Dreamer - BlackSakura hoodie, black everything
	{
		"name": "sakura_dreamer",
		"SkinTone": 1,
		"Face": 13,
		"EyeColor": 5,  # Pink
		"Hair": 3,  # LongWavy
		"HairColor": 1,  # Black
		"Top": 8,  # Hoodie
		"TopVariant": 1,  # BlackSakura
		"Bottom": 6,  # Skirt
		"BottomVariant": 0,  # Black
		"Shoes": 7,  # OverKneeSocks
		"ShoesVariant": 0,  # Black
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 3. Collegiate Star - BlueStar tee, khaki shorts, white/yellow cap
	{
		"name": "collegiate_star",
		"SkinTone": 2,
		"Face": 14,
		"EyeColor": 1,  # Blue
		"Hair": 4,  # Afro
		"HairColor": 5,  # DarkBrown
		"Top": 7,  # Tshirt
		"TopVariant": 5,  # BlueStar
		"Bottom": 2,  # Shorts
		"BottomVariant": 2,  # Khaki
		"Shoes": 8,  # Sneakers
		"ShoesVariant": 2,  # White
		"Hat": 9,  # BaseballCap
		"HatVariant": 7,  # WhiteYellow
		"Glasses": 0,
	},
	
	# 4. Mushroom Scholar - MaroonMushroom sweater, khaki, brown oxfords
	{
		"name": "mushroom_scholar",
		"SkinTone": 3,
		"Face": 6,
		"EyeColor": 3,  # Green
		"Hair": 4,  # MessyKnotBun
		"HairColor": 6,  # Ginger
		"Top": 3,  # Sweater
		"TopVariant": 4,  # MaroonMushroom
		"Bottom": 3,  # Pants
		"BottomVariant": 4,  # Khaki
		"Shoes": 2,  # Oxfords
		"ShoesVariant": 1,  # Brown
		"Hat": 0,
		"Glasses": 1,  # Round
	},
	
	# 5. Pink Cowgirl - PinkFloral dress, houndstooth, lavender boots, pink cowboy
	{
		"name": "pink_cowgirl",
		"SkinTone": 4,
		"Face": 12,
		"EyeColor": 4,  # LightBrown
		"Hair": 3,  # LongWavy
		"HairColor": 10,  # LightBrown
		"Top": 4,  # PuffSleeveDress
		"TopVariant": 3,  # PinkFloral
		"Bottom": 6,  # Skirt
		"BottomVariant": 3,  # Houndstooth
		"Shoes": 3,  # ChunkyBoots
		"ShoesVariant": 1,  # Lavender
		"Hat": 1,  # Cowboy
		"HatVariant": 2,  # Pink
		"Glasses": 5,  # HeartSunglasses
		"GlassesVariant": 0,  # Pink
	},
	
	# 6. Froggy Weather - OliveCollegiate hoodie, yellow rainboots, froggy hat
	{
		"name": "froggy_weather",
		"SkinTone": 0,
		"Face": 0,
		"EyeColor": 3,  # Green
		"Hair": 2,  # BabyBangs
		"HairColor": 10,  # LightBrown
		"Top": 8,  # Hoodie
		"TopVariant": 5,  # OliveCollegiate
		"Bottom": 3,  # Pants
		"BottomVariant": 5,  # Olive
		"Shoes": 4,  # RainBoots
		"ShoesVariant": 1,  # Yellow
		"Hat": 2,  # Fisherman
		"HatVariant": 1,  # GreenFroggy
		"Glasses": 0,
	},
	
	# 7. Lightning Gamer - OliveLightning tee, black shorts, BlueStar cap
	{
		"name": "lightning_gamer",
		"SkinTone": 7,
		"Face": 0,
		"EyeColor": 8,  # Teal
		"Hair": 8,  # WavyMiddlePart
		"HairColor": 8,  # Green
		"Top": 7,  # Tshirt
		"TopVariant": 12,  # OliveLightning
		"Bottom": 2,  # Shorts
		"BottomVariant": 0,  # Black
		"Shoes": 8,  # Sneakers
		"ShoesVariant": 0,  # BlackWithWhiteStripes
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 8. Midnight Witch - Black hoodie, black skirt, witch hat, aviators
	{
		"name": "midnight_witch",
		"SkinTone": 9,
		"Face": 9,
		"EyeColor": 6,  # Purple
		"Hair": 3,  # LongWavy
		"HairColor": 14,  # Purple
		"Top": 8,  # Hoodie
		"TopVariant": 0,  # Black
		"Bottom": 6,  # Skirt
		"BottomVariant": 0,  # Black
		"Shoes": 7,  # OverKneeSocks
		"ShoesVariant": 0,  # Black
		"Hat": 11,  # Witch
		"HatVariant": 0,  # Black
		"Glasses": 2,  # Aviator
		"GlassesVariant": 0,  # Black
	},
	
	# 9. Lavender Artist - LavenderStar tee, denim skirt, striped socks, hearts
	{
		"name": "lavender_artist",
		"SkinTone": 4,
		"Face": 11,
		"EyeColor": 6,  # Purple
		"Hair": 7,  # StarBuns
		"HairColor": 12,  # PastelPink
		"Top": 7,  # Tshirt
		"TopVariant": 7,  # LavenderStar
		"Bottom": 6,  # Skirt
		"BottomVariant": 2,  # Denim
		"Shoes": 7,  # OverKneeSocks
		"ShoesVariant": 2,  # BlackWhiteStripes
		"Hat": 0,
		"Glasses": 5,  # HeartSunglasses
		"GlassesVariant": 2,  # Lavender
	},
	
	# 10. Cool Wizard - Mystical style (KEEP AS IS)
	{
		"name": "cool_wizard",
		"SkinTone": 1,
		"Face": 3,
		"EyeColor": 1,  # Blue
		"Hair": 4,  # MessyKnotBun
		"HairColor": 19,  # White
		"Top": 6,  # WizardRobe
		"TopVariant": 0,  # Beige
		"Bottom": 3,  # Pants
		"BottomVariant": 0,  # Black
		"Shoes": 6,  # WizardBoots
		"ShoesVariant": 0,
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 11. Top Hat Gentleman - All black formal with white tophat
	{
		"name": "tophat_gentleman",
		"SkinTone": 8,
		"Face": 10,
		"EyeColor": 2,  # DarkBrown
		"Hair": 2,  # BabyBangs
		"HairColor": 1,  # Black
		"Top": 3,  # Sweater
		"TopVariant": 0,  # Black
		"Bottom": 3,  # Pants
		"BottomVariant": 0,  # Black
		"Shoes": 2,  # Oxfords
		"ShoesVariant": 0,  # Black
		"Hat": 10,  # TopHat
		"HatVariant": 1,  # White
		"Glasses": 2,  # Aviator
		"GlassesVariant": 0,  # Black
	},
	
	# 12. Swirl Mystery - BlackSwirl hoodie, snow camo pants
	{
		"name": "swirl_mystery",
		"SkinTone": 5,
		"Face": 7,
		"EyeColor": 9,  # White
		"Hair": 6,  # Mullet
		"HairColor": 7,  # Gray
		"Top": 8,  # Hoodie
		"TopVariant": 2,  # BlackSwirl
		"Bottom": 3,  # Pants
		"BottomVariant": 2,  # CamoSnow
		"Shoes": 3,  # ChunkyBoots
		"ShoesVariant": 0,  # Black
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 13. Pumpkin Spirit - PumpkinCollegiate tee, olive shorts, red cap
	{
		"name": "pumpkin_spirit",
		"SkinTone": 6,
		"Face": 5,
		"EyeColor": 4,  # LightBrown
		"Hair": 6,  # Afro
		"HairColor": 15,  # Red
		"Top": 7,  # Tshirt
		"TopVariant": 14,  # PumpkinCollegiate
		"Bottom": 2,  # Shorts
		"BottomVariant": 3,  # Olive
		"Shoes": 8,  # Sneakers
		"ShoesVariant": 2,  # White
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 14. Maroon Warrior - Maroon tunic, red camo, beige cowboy
	{
		"name": "maroon_warrior",
		"SkinTone": 7,
		"Face": 11,
		"EyeColor": 7,  # Red
		"Hair": 3,  # LongWavy
		"HairColor": 11,  # Maroon
		"Top": 5,  # WarriorTunic
		"TopVariant": 2,  # Maroon
		"Bottom": 3,  # Pants
		"BottomVariant": 1,  # CamoRed
		"Shoes": 5,  # WarriorBoots
		"ShoesVariant": 0,
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 15. Blue Royalty - Blue wizard robe, black pants, white tophat
	{
		"name": "blue_royalty",
		"SkinTone": 9,
		"Face": 2,
		"EyeColor": 1,  # Blue
		"Hair": 8,  # WavyMiddlePart
		"HairColor": 3,  # Blue
		"Top": 6,  # WizardRobe
		"TopVariant": 1,  # Blue
		"Bottom": 3,  # Pants
		"BottomVariant": 0,  # Black
		"Shoes": 6,  # WizardBoots
		"ShoesVariant": 0,
		"Hat": 0,
		"Glasses": 0,
	},
	
	# 16. Beach Sunshine - White tank, bluefloral skirt, yellow strawhat
	{
		"name": "beach_sunshine",
		"SkinTone": 0,
		"Face": 4,
		"EyeColor": 1,  # Blue
		"Hair": 2,  # BabyBangs
		"HairColor": 2,  # Blonde
		"Top": 1,  # Tank
		"TopVariant": 3,  # White
		"Bottom": 6,  # Skirt
		"BottomVariant": 1,  # BlueFloral
		"Shoes": 1,  # CrewSocks
		"ShoesVariant": 2,  # White
		"Hat": 7,  # StrawHat
		"HatVariant": 1,  # Yellow
		"Glasses": 0,
	},
	
	# 17. Robot Future - Black tee, snow camo, robot helmet
	{
		"name": "robot_future",
		"SkinTone": 8,
		"Face": 1,
		"EyeColor": 8,  # Teal
		"Hair": 5,  # MessySpiky
		"HairColor": 4,  # Cyan
		"Top": 7,  # Tshirt
		"TopVariant": 0,  # Black
		"Bottom": 3,  # Pants
		"BottomVariant": 2,  # CamoSnow
		"Shoes": 4,  # RainBoots
		"ShoesVariant": 0,  # Black
		"Hat": 12,  # RobotHelmet
		"HatVariant": 0,  # Blue
		"Glasses": 0,
	},
	
	# 18. Party Animal - Radiation tank, denim flares, rainbow propeller
	{
		"name": "party_animal",
		"SkinTone": 6,
		"Face": 8,
		"EyeColor": 10,  # Yellow
		"Hair": 7,  # StarBuns
		"HairColor": 16,  # Sunset
		"Top": 1,  # Tank
		"TopVariant": 1,  # BlackRadiation
		"Bottom": 5,  # FlarePants
		"BottomVariant": 1,  # Denim
		"Shoes": 3,  # ChunkyBoots
		"ShoesVariant": 1,  # Lavender
		"Hat": 6,  # PropellerCap
		"HatVariant": 0,  # Rainbow
		"Glasses": 3,  # CatEye
		"GlassesVariant": 1,  # Maroon
	},
	
	# 19. Navy Sophisticate - OliveCollegiate sweater, olive pants, navy porkpie
	{
		"name": "navy_sophisticate",
		"SkinTone": 8,
		"Face": 14,
		"EyeColor": 2,  # DarkBrown
		"Hair": 0,  # None
		"HairColor": 1,  # Black
		"Top": 3,  # Sweater
		"TopVariant": 6,  # OliveCollegiate
		"Bottom": 3,  # Pants
		"BottomVariant": 5,  # Olive
		"Shoes": 2,  # Oxfords
		"ShoesVariant": 1,  # Brown
		"Hat": 0,
		"Glasses": 2,  # Aviator
		"GlassesVariant": 1,  # Brown
	},
	
	# 20. Beige Sakura - BeigeSakura hoodie, denim, beige overkneesocks
	{
		"name": "beige_sakura",
		"SkinTone": 3,
		"Face": 13,
		"EyeColor": 4,  # LightBrown
		"Hair": 4,  # MessyKnotBun
		"HairColor": 10,  # LightBrown
		"Top": 8,  # Hoodie
		"TopVariant": 4,  # BeigeSakura
		"Bottom": 6,  # Skirt
		"BottomVariant": 2,  # Denim
		"Shoes": 7,  # OverKneeSocks
		"ShoesVariant": 1,  # Beige
		"Hat": 0,
		"Glasses": 1,  # Round
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
