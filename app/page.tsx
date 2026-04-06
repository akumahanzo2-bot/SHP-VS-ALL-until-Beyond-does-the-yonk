"use client"

import { useEffect, useRef, useState, useCallback } from "react"

// ============== TYPES ==============
interface Player {
  x: number
  y: number
  width: number
  height: number
  hp: number
  maxHp: number
  speed: number
  baseSpeed: number
  damage: number
  baseDamage: number
  defense: number
  gold: number
  name: string
  gender: "male" | "female"
  type: "f2p" | "p2p"
  colors: { primary: string; secondary: string; accent: string }
  berserkMode: boolean
  berserkCooldown: number
  attackCooldown: number
  facing: "left" | "right"
  state: "idle" | "walk" | "attack" | "hit" | "berserk"
  animFrame: number
  animTimer: number
  invincible: number
  weapon: Item | null
  armor: Item | null
  manual: Item | null
  abilities: Ability[]
  abilityLevels: number[]
  abilityCooldowns: number[]
  inventory: Item[]
}

interface Enemy {
  id: number
  x: number
  y: number
  width: number
  height: number
  hp: number
  maxHp: number
  speed: number
  damage: number
  type: "grunt" | "warrior" | "elite" | "boss"
  sect: string
  color: string
  state: "walk" | "attack" | "hit" | "death"
  animFrame: number
  animTimer: number
  attackCooldown: number
  facing: "left" | "right"
  knockback: { x: number; y: number; timer: number }
  hasDrop: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  type: "spark" | "aura" | "trail" | "blood" | "gold" | "energy" | "skill" | "lightning" | "wave"
}

interface DamageNumber {
  x: number
  y: number
  value: number | string
  life: number
  color: string
  isCrit: boolean
}

interface Item {
  id: string
  name: string
  type: "weapon" | "armor" | "consumable" | "manual"
  price: number
  basePrice: number
  stat: number
  durability?: number
  maxDurability?: number
  description: string
  rarity: "common" | "rare" | "epic" | "legendary"
  ability?: Ability
}

interface Ability {
  id: string
  name: string
  damage: number
  cooldown: number
  type: "slash" | "thrust" | "area" | "projectile" | "summon" | "drain"
  color: string
  level?: number
}

interface WaveDrop {
  type: "stat" | "skill"
  stat?: { name: string; value: number; display: string }
  skill?: Ability
}

interface GameState {
  screen: "menu" | "cinematic" | "game" | "shop" | "gameover" | "victory"
  time: number
  wave: number
  enemiesKilled: number
  beyondArrived: boolean
  beyondTimer: number
  screenShake: { x: number; y: number; intensity: number }
  paused: boolean
  cinematicStep: number
  waveDrop: WaveDrop | null
  showWaveDropChoice: boolean
}

interface ShopPrompt {
  item: Item
  stage: "confirm" | "use_or_keep"
}

interface SaveData {
  version: number
  timestamp: number
  character: {
    name: string
    gender: "male" | "female"
    type: "f2p" | "p2p"
    colors: { primary: string; secondary: string; accent: string }
  }
  player: {
    hp: number
    maxHp: number
    gold: number
    damage: number
    baseDamage: number
    defense: number
    speed: number
    baseSpeed: number
    x: number
    y: number
    weapon: Item | null
    armor: Item | null
    abilities: Ability[]
    abilityLevels: number[]
    inventory: Item[]
  }
  gameState: {
    time: number
    wave: number
    enemiesKilled: number
  }
  shopPrices: Record<string, number>
}

// ============== CONSTANTS ==============
const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const GAME_DURATION = 20 * 60 * 1000 // 20 minutes
const BEYOND_ARRIVAL_TIME = GAME_DURATION - 10000 // 10 seconds before end
const SKIP_TIME = 19 * 60 * 1000 + 55 * 1000 // 19:55

const SECTS = [
  { name: "Blood Moon Sect", color: "#ff3366" },
  { name: "Shadow Fang Clan", color: "#6633ff" },
  { name: "Iron Thunder Alliance", color: "#ffaa33" },
  { name: "Jade Serpent Order", color: "#33ff66" },
  { name: "Crimson Lotus Guild", color: "#ff6699" },
]

const CINEMATIC_TEXTS = [
  { title: "The Age of Chaos", text: "In the realm of martial arts, five great sects waged endless war for supremacy..." },
  { title: "The SHP Alliance", text: "A lone cultivator rose to unite the righteous paths. They called themselves the SHP Alliance." },
  { title: "The Enemy Strikes", text: "But the rival sects would not yield. They have gathered their forces to crush you..." },
  { title: "Beyond - The Legend", text: "Legend speaks of 'Beyond', the strongest genius to ever exist. If you survive 20 minutes, he will descend..." },
  { title: "Your Mission", text: "Survive. Fight. Hold the line until Beyond arrives to annihilate your enemies." },
]

// Exclusive skills not in shop
const EXCLUSIVE_SKILLS: Ability[] = [
  { id: "e1", name: "Soul Drain", damage: 40, cooldown: 6000, type: "drain", color: "#9933ff", level: 1 },
  { id: "e2", name: "Phoenix Rebirth", damage: 0, cooldown: 30000, type: "summon", color: "#ff6600", level: 1 },
  { id: "e3", name: "Void Step", damage: 25, cooldown: 4000, type: "projectile", color: "#333366", level: 1 },
  { id: "e4", name: "Heavenly Palm", damage: 80, cooldown: 7000, type: "area", color: "#ffff66", level: 1 },
  { id: "e5", name: "Blood Lotus", damage: 50, cooldown: 5000, type: "slash", color: "#ff0066", level: 1 },
]

const STAT_BOOSTS = [
  { name: "maxHp", value: 20, display: "+20 Max HP" },
  { name: "damage", value: 5, display: "+5 Damage" },
  { name: "defense", value: 3, display: "+3 Defense" },
  { name: "speed", value: 0.3, display: "+0.3 Speed" },
  { name: "crit", value: 0.05, display: "+5% Crit Chance" },
]

const SHOP_ITEMS: Item[] = [
  // Weapons
  { id: "w1", name: "Iron Sword", type: "weapon", price: 50, basePrice: 50, stat: 5, durability: 100, maxDurability: 100, description: "Basic iron blade", rarity: "common" },
  { id: "w2", name: "Steel Saber", type: "weapon", price: 120, basePrice: 120, stat: 12, durability: 80, maxDurability: 80, description: "Sharp steel saber", rarity: "rare" },
  { id: "w3", name: "Phoenix Blade", type: "weapon", price: 300, basePrice: 300, stat: 25, durability: 60, maxDurability: 60, description: "Blade forged in phoenix fire", rarity: "epic" },
  { id: "w4", name: "Heaven Splitter", type: "weapon", price: 800, basePrice: 800, stat: 50, durability: 40, maxDurability: 40, description: "Legendary sword of destruction", rarity: "legendary" },
  // Armor
  { id: "a1", name: "Cloth Robe", type: "armor", price: 40, basePrice: 40, stat: 3, durability: 120, maxDurability: 120, description: "Basic protection", rarity: "common" },
  { id: "a2", name: "Leather Armor", type: "armor", price: 100, basePrice: 100, stat: 8, durability: 100, maxDurability: 100, description: "Decent defense", rarity: "rare" },
  { id: "a3", name: "Dragon Scale Mail", type: "armor", price: 280, basePrice: 280, stat: 18, durability: 70, maxDurability: 70, description: "Scales of a dragon", rarity: "epic" },
  { id: "a4", name: "Immortal Vestment", type: "armor", price: 700, basePrice: 700, stat: 35, durability: 50, maxDurability: 50, description: "Robes of an immortal", rarity: "legendary" },
  // Consumables
  { id: "c1", name: "Health Pill", type: "consumable", price: 25, basePrice: 25, stat: 30, description: "Restores 30 HP", rarity: "common" },
  { id: "c2", name: "Spirit Elixir", type: "consumable", price: 60, basePrice: 60, stat: 80, description: "Restores 80 HP", rarity: "rare" },
  { id: "c3", name: "Dragon Blood", type: "consumable", price: 150, basePrice: 150, stat: 200, description: "Full HP restore", rarity: "epic" },
  // Manuals
  { id: "m1", name: "Wind Slash Manual", type: "manual", price: 200, basePrice: 200, stat: 0, description: "Learn Wind Slash technique", rarity: "rare", ability: { id: "m1", name: "Wind Slash", damage: 30, cooldown: 3000, type: "slash", color: "#66ffff", level: 1 } },
  { id: "m2", name: "Thunder Strike Manual", type: "manual", price: 400, basePrice: 400, stat: 0, description: "Learn Thunder Strike", rarity: "epic", ability: { id: "m2", name: "Thunder Strike", damage: 60, cooldown: 5000, type: "area", color: "#ffff33", level: 1 } },
  { id: "m3", name: "Dragon Fist Manual", type: "manual", price: 600, basePrice: 600, stat: 0, description: "Learn Dragon Fist", rarity: "legendary", ability: { id: "m3", name: "Dragon Fist", damage: 100, cooldown: 8000, type: "thrust", color: "#ff6633", level: 1 } },
]

export default function WuxiaDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const keysRef = useRef<Set<string>>(new Set())
  const touchRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    screen: "menu",
    time: 0,
    wave: 1,
    enemiesKilled: 0,
    beyondArrived: false,
    beyondTimer: 0,
    screenShake: { x: 0, y: 0, intensity: 0 },
    paused: false,
    cinematicStep: 0,
    waveDrop: null,
    showWaveDropChoice: false,
  })

  // Shop prompt state
  const [shopPrompt, setShopPrompt] = useState<ShopPrompt | null>(null)
  const [selectedShopIndex, setSelectedShopIndex] = useState(0)

  // Character creation state
  const [charName, setCharName] = useState("")
  const [charGender, setCharGender] = useState<"male" | "female">("male")
  const [charType, setCharType] = useState<"f2p" | "p2p">("f2p")
  const [primaryColor, setPrimaryColor] = useState("#3366ff")
  const [secondaryColor, setSecondaryColor] = useState("#ffffff")
  const [accentColor, setAccentColor] = useState("#ffcc00")

  // Game entities (refs to avoid re-renders during game loop)
  const playerRef = useRef<Player | null>(null)
  const enemiesRef = useRef<Enemy[]>([])
  const particlesRef = useRef<Particle[]>([])
  const damageNumbersRef = useRef<DamageNumber[]>([])
  const gameStateRef = useRef(gameState)
  const shopPricesRef = useRef<Map<string, number>>(new Map())
  const enemyIdCounter = useRef(0)
  const lastWaveRef = useRef(0)
  const critChanceRef = useRef(0.1)

  // Update gameStateRef when gameState changes
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // Initialize player
  const initPlayer = useCallback(() => {
    const isP2P = charType === "p2p"
    playerRef.current = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      width: 32,
      height: 48,
      hp: isP2P ? 50 : 100,
      maxHp: isP2P ? 50 : 100,
      speed: isP2P ? 2 : 3,
      baseSpeed: isP2P ? 2 : 3,
      damage: isP2P ? 5 : 15,
      baseDamage: isP2P ? 5 : 15,
      defense: isP2P ? 1 : 5,
      gold: isP2P ? 500 : 0,
      name: charName || "Disciple",
      gender: charGender,
      type: charType,
      colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
      berserkMode: false,
      berserkCooldown: 0,
      attackCooldown: 0,
      facing: "right",
      state: "idle",
      animFrame: 0,
      animTimer: 0,
      invincible: 0,
      weapon: null,
      armor: null,
      manual: null,
      abilities: [],
      abilityLevels: [],
      abilityCooldowns: [],
      inventory: [],
    }
    enemiesRef.current = []
    particlesRef.current = []
    damageNumbersRef.current = []
    shopPricesRef.current = new Map()
    SHOP_ITEMS.forEach(item => shopPricesRef.current.set(item.id, item.basePrice))
    lastWaveRef.current = 0
    critChanceRef.current = 0.1
  }, [charName, charGender, charType, primaryColor, secondaryColor, accentColor])

  // Spawn enemy
  const spawnEnemy = useCallback((forceHasDrop: boolean = false) => {
    const state = gameStateRef.current
    const wave = state.wave
    const side = Math.random() < 0.5 ? "left" : "right"
    const sect = SECTS[Math.floor(Math.random() * SECTS.length)]
    
    // Determine enemy type based on wave and randomness
    let type: Enemy["type"] = "grunt"
    const roll = Math.random()
    if (wave >= 10 && roll < 0.05) type = "boss"
    else if (wave >= 5 && roll < 0.15) type = "elite"
    else if (wave >= 2 && roll < 0.3) type = "warrior"

    const baseStats = {
      grunt: { hp: 30 + wave * 5, damage: 5 + wave, speed: 1.5, size: 1 },
      warrior: { hp: 60 + wave * 10, damage: 10 + wave * 2, speed: 1.2, size: 1.2 },
      elite: { hp: 120 + wave * 20, damage: 20 + wave * 3, speed: 1, size: 1.4 },
      boss: { hp: 300 + wave * 50, damage: 40 + wave * 5, speed: 0.8, size: 1.8 },
    }

    const stats = baseStats[type]
    const width = 28 * stats.size
    const height = 42 * stats.size

    const enemy: Enemy = {
      id: enemyIdCounter.current++,
      x: side === "left" ? -width : GAME_WIDTH + width,
      y: 100 + Math.random() * (GAME_HEIGHT - 200),
      width,
      height,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      damage: stats.damage,
      type,
      sect: sect.name,
      color: sect.color,
      state: "walk",
      animFrame: 0,
      animTimer: 0,
      attackCooldown: 0,
      facing: side === "left" ? "right" : "left",
      knockback: { x: 0, y: 0, timer: 0 },
      hasDrop: forceHasDrop,
    }

    enemiesRef.current.push(enemy)
  }, [])

  // Create particles
  const createParticles = useCallback((x: number, y: number, count: number, color: string, type: Particle["type"]) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = type === "skill" ? 2 + Math.random() * 5 : type === "lightning" ? 5 + Math.random() * 10 : 1 + Math.random() * 3
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: type === "skill" ? 60 + Math.random() * 40 : type === "wave" ? 120 : 30 + Math.random() * 30,
        maxLife: type === "skill" ? 100 : 60,
        color,
        size: type === "aura" || type === "skill" ? 8 + Math.random() * 8 : type === "lightning" ? 3 : 2 + Math.random() * 4,
        type,
      })
    }
  }, [])

  // Create skill effect particles (more dramatic)
  const createSkillEffect = useCallback((x: number, y: number, ability: Ability, level: number) => {
    const intensity = 20 + level * 10
    
    // Main burst
    createParticles(x, y, intensity, ability.color, "skill")
    
    // Secondary effects based on type
    if (ability.type === "slash") {
      // Crescent wave effect
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI / 4) + (i / 20) * (Math.PI / 2)
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * (4 + level),
          vy: Math.sin(angle) * (2 + level * 0.5),
          life: 40,
          maxLife: 40,
          color: ability.color,
          size: 6 + level * 2,
          type: "skill",
        })
      }
    } else if (ability.type === "area") {
      // Expanding ring
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * (3 + level),
          vy: Math.sin(angle) * (3 + level),
          life: 50,
          maxLife: 50,
          color: ability.color,
          size: 8 + level * 2,
          type: "skill",
        })
      }
      // Lightning for thunder
      if (ability.name.includes("Thunder") || ability.name.includes("Lightning")) {
        createParticles(x, y - 100, 30, "#ffff00", "lightning")
      }
    } else if (ability.type === "thrust") {
      // Forward beam
      for (let i = 0; i < 30; i++) {
        particlesRef.current.push({
          x, y,
          vx: (5 + level + Math.random() * 3) * (playerRef.current?.facing === "right" ? 1 : -1),
          vy: (Math.random() - 0.5) * 2,
          life: 30,
          maxLife: 30,
          color: ability.color,
          size: 10 + level * 3,
          type: "skill",
        })
      }
    } else if (ability.type === "drain") {
      // Spiral inward effect
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2
        const dist = 80 + level * 20
        particlesRef.current.push({
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          vx: -Math.cos(angle) * 3,
          vy: -Math.sin(angle) * 3,
          life: 60,
          maxLife: 60,
          color: ability.color,
          size: 5,
          type: "skill",
        })
      }
    }
  }, [createParticles])

  // Create damage number
  const createDamageNumber = useCallback((x: number, y: number, value: number | string, isCrit: boolean = false) => {
    damageNumbersRef.current.push({
      x,
      y,
      value,
      life: 60,
      color: isCrit ? "#ffff00" : typeof value === "number" && value > 0 ? "#ff3333" : "#33ff33",
      isCrit,
    })
  }, [])

  // Screen shake
  const triggerScreenShake = useCallback((intensity: number) => {
    setGameState(prev => ({
      ...prev,
      screenShake: { x: 0, y: 0, intensity },
    }))
  }, [])

  // Combat: Player attacks enemies
  const playerAttack = useCallback(() => {
    const player = playerRef.current
    if (!player || player.attackCooldown > 0) return

    player.state = "attack"
    player.animFrame = 0
    player.attackCooldown = player.berserkMode ? 15 : 30

    const attackRange = 60
    const attackWidth = 80
    const attackX = player.facing === "right" ? player.x + player.width / 2 : player.x - player.width / 2 - attackWidth

    // Create sword trail effect
    createParticles(
      player.x + (player.facing === "right" ? 40 : -40),
      player.y,
      10,
      player.berserkMode ? "#ff0000" : player.colors.accent,
      "trail"
    )

    enemiesRef.current.forEach(enemy => {
      if (enemy.state === "death") return
      
      const enemyCenterX = enemy.x + enemy.width / 2
      const enemyCenterY = enemy.y + enemy.height / 2
      const playerCenterY = player.y + player.height / 2

      if (
        enemyCenterX > attackX &&
        enemyCenterX < attackX + attackWidth + attackRange &&
        Math.abs(enemyCenterY - playerCenterY) < 50
      ) {
        const weaponDamage = player.weapon ? player.weapon.stat : 0
        const totalDamage = player.damage + weaponDamage
        const isCrit = Math.random() < (player.berserkMode ? 0.3 : critChanceRef.current)
        const finalDamage = isCrit ? totalDamage * 2 : totalDamage

        enemy.hp -= finalDamage
        enemy.state = "hit"
        enemy.animFrame = 0
        
        // Knockback
        enemy.knockback = {
          x: player.facing === "right" ? 8 : -8,
          y: 0,
          timer: 10,
        }

        // Reduce weapon durability
        if (player.weapon && player.weapon.durability !== undefined) {
          player.weapon.durability--
          if (player.weapon.durability <= 0) {
            player.weapon = null
            player.damage = player.baseDamage
          }
        }

        // Effects
        createParticles(enemyCenterX, enemyCenterY, 8, enemy.color, "spark")
        createDamageNumber(enemyCenterX, enemyCenterY - 20, finalDamage, isCrit)
        triggerScreenShake(isCrit ? 8 : 4)

        // Check death
        if (enemy.hp <= 0) {
          enemy.state = "death"
          enemy.animFrame = 0
          setGameState(prev => ({ ...prev, enemiesKilled: prev.enemiesKilled + 1 }))
          
          // Drop gold
          const goldDrop = Math.floor(5 + Math.random() * 10 * (enemy.type === "boss" ? 10 : enemy.type === "elite" ? 5 : enemy.type === "warrior" ? 2 : 1))
          player.gold += goldDrop
          createParticles(enemyCenterX, enemyCenterY, 15, "#ffcc00", "gold")
          createDamageNumber(enemyCenterX, enemyCenterY - 40, goldDrop, false)

          // Wave drop
          if (enemy.hasDrop) {
            createParticles(enemyCenterX, enemyCenterY, 50, "#ff00ff", "wave")
            triggerWaveDrop()
          }
        }
      }
    })
  }, [createParticles, createDamageNumber, triggerScreenShake])

  // Trigger wave drop reward
  const triggerWaveDrop = useCallback(() => {
    const isSkill = Math.random() < 0.4 // 40% chance for skill
    
    if (isSkill) {
      // Pick a random exclusive skill player doesn't have
      const player = playerRef.current
      if (!player) return
      
      const availableSkills = EXCLUSIVE_SKILLS.filter(
        skill => !player.abilities.some(a => a.id === skill.id)
      )
      
      if (availableSkills.length > 0) {
        const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)]
        setGameState(prev => ({
          ...prev,
          waveDrop: { type: "skill", skill: { ...skill } },
          showWaveDropChoice: true,
          paused: true,
        }))
        return
      }
    }
    
    // Stat boost
    const stat = STAT_BOOSTS[Math.floor(Math.random() * STAT_BOOSTS.length)]
    setGameState(prev => ({
      ...prev,
      waveDrop: { type: "stat", stat },
      showWaveDropChoice: true,
      paused: true,
    }))
  }, [])

  // Apply wave drop
  const applyWaveDrop = useCallback(() => {
    const player = playerRef.current
    const drop = gameStateRef.current.waveDrop
    if (!player || !drop) return

    if (drop.type === "stat" && drop.stat) {
      switch (drop.stat.name) {
        case "maxHp":
          player.maxHp += drop.stat.value
          player.hp += drop.stat.value
          break
        case "damage":
          player.damage += drop.stat.value
          player.baseDamage += drop.stat.value
          break
        case "defense":
          player.defense += drop.stat.value
          break
        case "speed":
          player.speed += drop.stat.value
          player.baseSpeed += drop.stat.value
          break
        case "crit":
          critChanceRef.current += drop.stat.value
          break
      }
      createDamageNumber(player.x + player.width / 2, player.y - 40, drop.stat.display, true)
    } else if (drop.type === "skill" && drop.skill) {
      if (player.abilities.length < 3) {
        player.abilities.push({ ...drop.skill })
        player.abilityLevels.push(1)
        player.abilityCooldowns.push(0)
        createDamageNumber(player.x + player.width / 2, player.y - 40, `Learned ${drop.skill.name}!`, true)
      }
    }

    createParticles(player.x + player.width / 2, player.y + player.height / 2, 30, "#ff00ff", "energy")
    
    setGameState(prev => ({
      ...prev,
      waveDrop: null,
      showWaveDropChoice: false,
      paused: false,
    }))
  }, [createParticles, createDamageNumber])

  // Use ability
  const useAbility = useCallback((index: number) => {
    const player = playerRef.current
    if (!player || !player.abilities[index] || player.abilityCooldowns[index] > 0) return

    const ability = player.abilities[index]
    const level = player.abilityLevels[index] || 1
    player.abilityCooldowns[index] = ability.cooldown * (1 - (level - 1) * 0.1) // Reduced cooldown per level

    // Create ability effects
    const abilityX = player.facing === "right" ? player.x + 50 : player.x - 50
    const abilityY = player.y + player.height / 2

    createSkillEffect(abilityX, abilityY, ability, level)

    // Area damage for abilities
    const range = (ability.type === "area" ? 150 : ability.type === "slash" ? 100 : 80) + level * 20
    const damage = ability.damage * (1 + (level - 1) * 0.25) * (player.berserkMode ? 1.5 : 1)

    // Special ability effects
    if (ability.type === "drain") {
      // Heal for portion of damage dealt
      let totalHealed = 0
      enemiesRef.current.forEach(enemy => {
        if (enemy.state === "death") return
        const dist = Math.hypot(enemy.x + enemy.width / 2 - player.x - player.width / 2, enemy.y + enemy.height / 2 - player.y - player.height / 2)
        if (dist < range) {
          enemy.hp -= damage
          enemy.state = "hit"
          totalHealed += damage * 0.3
          createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 12, ability.color, "energy")
          createDamageNumber(enemy.x + enemy.width / 2, enemy.y - 20, Math.round(damage), true)
          if (enemy.hp <= 0) {
            enemy.state = "death"
            setGameState(prev => ({ ...prev, enemiesKilled: prev.enemiesKilled + 1 }))
            player.gold += Math.floor(10 + Math.random() * 20)
            createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, "#ffcc00", "gold")
          }
        }
      })
      player.hp = Math.min(player.maxHp, player.hp + Math.round(totalHealed))
      if (totalHealed > 0) {
        createDamageNumber(player.x + player.width / 2, player.y - 20, `+${Math.round(totalHealed)} HP`, false)
      }
    } else if (ability.type === "summon" && ability.name === "Phoenix Rebirth") {
      // Full heal and damage boost
      player.hp = player.maxHp
      player.damage += 10
      createDamageNumber(player.x + player.width / 2, player.y - 40, "REBIRTH!", true)
      createParticles(player.x + player.width / 2, player.y + player.height / 2, 50, "#ff6600", "aura")
    } else {
      enemiesRef.current.forEach(enemy => {
        if (enemy.state === "death") return

        const dist = Math.hypot(
          enemy.x + enemy.width / 2 - player.x - player.width / 2,
          enemy.y + enemy.height / 2 - player.y - player.height / 2
        )

        if (dist < range) {
          enemy.hp -= damage
          enemy.state = "hit"
          createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 12, ability.color, "energy")
          createDamageNumber(enemy.x + enemy.width / 2, enemy.y - 20, Math.round(damage), true)

          if (enemy.hp <= 0) {
            enemy.state = "death"
            setGameState(prev => ({ ...prev, enemiesKilled: prev.enemiesKilled + 1 }))
            const goldDrop = Math.floor(10 + Math.random() * 20)
            player.gold += goldDrop
            createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, "#ffcc00", "gold")
          }
        }
      })
    }

    triggerScreenShake(12 + level * 2)
  }, [createSkillEffect, createParticles, createDamageNumber, triggerScreenShake])

  // Enemy attacks player
  const enemyAttack = useCallback((enemy: Enemy) => {
    const player = playerRef.current
    if (!player || player.invincible > 0) return

    const armorDefense = player.armor ? player.armor.stat : 0
    const totalDefense = player.defense + armorDefense
    const damage = Math.max(1, enemy.damage - totalDefense)
    
    player.hp -= damage
    player.state = "hit"
    player.invincible = 30

    // Reduce armor durability
    if (player.armor && player.armor.durability !== undefined) {
      player.armor.durability--
      if (player.armor.durability <= 0) {
        player.armor = null
        player.defense = player.type === "p2p" ? 1 : 5
      }
    }

    createParticles(player.x + player.width / 2, player.y + player.height / 2, 10, "#ff0000", "blood")
    createDamageNumber(player.x + player.width / 2, player.y - 20, damage, false)
    triggerScreenShake(6)

    // Check F2P berserk mode
    if (player.type === "f2p" && player.hp <= player.maxHp * 0.3 && !player.berserkMode && player.berserkCooldown <= 0) {
      player.berserkMode = true
      player.berserkCooldown = 600 // 10 seconds duration
      player.damage = player.baseDamage * 2
      player.speed = player.baseSpeed * 1.5
      player.state = "berserk"
      createParticles(player.x + player.width / 2, player.y + player.height / 2, 50, "#ff0000", "aura")
      triggerScreenShake(15)
    }

    // Check game over
    if (player.hp <= 0) {
      setGameState(prev => ({ ...prev, screen: "gameover" }))
    }
  }, [createParticles, createDamageNumber, triggerScreenShake])

  // Initiate shop purchase
  const initiatePurchase = useCallback((item: Item) => {
    setShopPrompt({ item, stage: "confirm" })
  }, [])

  // Confirm purchase
  const confirmPurchase = useCallback((useNow: boolean = false) => {
    const player = playerRef.current
    if (!player || !shopPrompt) return

    const item = shopPrompt.item
    const currentPrice = shopPricesRef.current.get(item.id) || item.basePrice
    
    if (player.gold < currentPrice) {
      setShopPrompt(null)
      return
    }

    player.gold -= currentPrice
    shopPricesRef.current.set(item.id, Math.floor(currentPrice * 1.3))

    if (item.type === "weapon") {
      player.weapon = { ...item, durability: item.maxDurability }
      player.damage = player.baseDamage + item.stat
    } else if (item.type === "armor") {
      player.armor = { ...item, durability: item.maxDurability }
      player.defense = (player.type === "p2p" ? 1 : 5) + item.stat
    } else if (item.type === "consumable") {
      if (useNow) {
        player.hp = Math.min(player.maxHp, player.hp + item.stat)
        createParticles(player.x + player.width / 2, player.y + player.height / 2, 20, "#33ff33", "energy")
      } else {
        player.inventory.push({ ...item })
      }
    } else if (item.type === "manual" && item.ability) {
      // Check if player already has this ability
      const existingIndex = player.abilities.findIndex(a => a.id === item.ability!.id)
      
      if (existingIndex >= 0) {
        // Upgrade existing ability
        player.abilityLevels[existingIndex] = (player.abilityLevels[existingIndex] || 1) + 1
        const newLevel = player.abilityLevels[existingIndex]
        player.abilities[existingIndex].damage = item.ability.damage * (1 + (newLevel - 1) * 0.25)
        createDamageNumber(player.x + player.width / 2, player.y - 40, `${item.ability.name} Lv.${newLevel}!`, true)
        createParticles(player.x + player.width / 2, player.y + player.height / 2, 30, item.ability.color, "skill")
      } else if (player.abilities.length < 3) {
        // Learn new ability
        player.abilities.push({ ...item.ability })
        player.abilityLevels.push(1)
        player.abilityCooldowns.push(0)
        player.manual = item
        createDamageNumber(player.x + player.width / 2, player.y - 40, `Learned ${item.ability.name}!`, true)
        createParticles(player.x + player.width / 2, player.y + player.height / 2, 30, item.ability.color, "skill")
      }
    }

    setShopPrompt(null)
  }, [shopPrompt, createParticles, createDamageNumber])

  // Use inventory item
  const useInventoryItem = useCallback((index: number) => {
    const player = playerRef.current
    if (!player || !player.inventory[index]) return

    const item = player.inventory[index]
    if (item.type === "consumable") {
      player.hp = Math.min(player.maxHp, player.hp + item.stat)
      createParticles(player.x + player.width / 2, player.y + player.height / 2, 20, "#33ff33", "energy")
      player.inventory.splice(index, 1)
    }
  }, [createParticles])

  // Draw pixel art character
  const drawPixelCharacter = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    colors: { primary: string; secondary: string; accent: string },
    facing: "left" | "right",
    state: string,
    frame: number,
    isBerserk: boolean,
    gender: "male" | "female"
  ) => {
    ctx.save()
    
    if (facing === "left") {
      ctx.translate(x + width, y)
      ctx.scale(-1, 1)
      x = 0
      y = 0
    } else {
      ctx.translate(x, y)
      x = 0
      y = 0
    }

    // Animation offsets
    const walkBob = state === "walk" ? Math.sin(frame * 0.3) * 2 : 0
    const attackSwing = state === "attack" ? Math.sin(frame * 0.5) * 10 : 0
    const hitShake = state === "hit" ? (Math.random() - 0.5) * 4 : 0

    // Berserk aura
    if (isBerserk) {
      const auraSize = 8 + Math.sin(Date.now() * 0.01) * 4
      ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(Date.now() * 0.02) * 0.2})`
      ctx.beginPath()
      ctx.ellipse(width / 2 + hitShake, height / 2 + walkBob, width / 2 + auraSize, height / 2 + auraSize, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const px = hitShake

    // Body (robe)
    ctx.fillStyle = colors.primary
    ctx.fillRect(px + 8, 16 + walkBob, 16, 24)

    // Robe details
    ctx.fillStyle = colors.secondary
    ctx.fillRect(px + 10, 18 + walkBob, 2, 20)
    ctx.fillRect(px + 20, 18 + walkBob, 2, 20)

    // Belt
    ctx.fillStyle = colors.accent
    ctx.fillRect(px + 6, 28 + walkBob, 20, 3)

    // Legs
    const legOffset = state === "walk" ? Math.sin(frame * 0.3) * 3 : 0
    ctx.fillStyle = "#333333"
    ctx.fillRect(px + 10, 40 + walkBob, 4, 8)
    ctx.fillRect(px + 18, 40 + walkBob - legOffset, 4, 8)

    // Head
    ctx.fillStyle = "#ffd4b0"
    ctx.fillRect(px + 10, 4 + walkBob, 12, 12)

    // Hair
    ctx.fillStyle = gender === "female" ? "#4a3728" : "#2a1a08"
    ctx.fillRect(px + 8, 2 + walkBob, 16, 6)
    if (gender === "female") {
      ctx.fillRect(px + 6, 6 + walkBob, 4, 14)
      ctx.fillRect(px + 22, 6 + walkBob, 4, 14)
    }

    // Eyes
    ctx.fillStyle = "#000000"
    ctx.fillRect(px + 12, 8 + walkBob, 2, 2)
    ctx.fillRect(px + 18, 8 + walkBob, 2, 2)

    // Arms
    ctx.fillStyle = colors.primary
    const armAngle = state === "attack" ? attackSwing : 0
    ctx.fillRect(px + 4, 18 + walkBob + armAngle * 0.5, 4, 12)
    ctx.fillRect(px + 24, 18 + walkBob - armAngle * 0.3, 4, 12)

    // Weapon (if attacking or has weapon)
    if (state === "attack" || isBerserk) {
      ctx.fillStyle = isBerserk ? "#ff3333" : colors.accent
      ctx.save()
      ctx.translate(px + 28, 20 + walkBob)
      ctx.rotate((attackSwing * Math.PI) / 180)
      ctx.fillRect(0, -2, 24, 4)
      ctx.fillRect(20, -4, 6, 8)
      
      // Sword trail
      if (isBerserk) {
        ctx.fillStyle = `rgba(255, 0, 0, 0.5)`
        ctx.fillRect(0, -4, 24, 8)
      }
      ctx.restore()
    }

    ctx.restore()
  }, [])

  // Draw pixel art enemy
  const drawPixelEnemy = useCallback((
    ctx: CanvasRenderingContext2D,
    enemy: Enemy
  ) => {
    ctx.save()
    
    const { x, y, width, height, color, state, animFrame, type, facing, hasDrop } = enemy

    if (facing === "left") {
      ctx.translate(x + width, y)
      ctx.scale(-1, 1)
    } else {
      ctx.translate(x, y)
    }

    const walkBob = state === "walk" ? Math.sin(animFrame * 0.2) * 2 : 0
    const hitShake = state === "hit" ? (Math.random() - 0.5) * 4 : 0
    const deathFade = state === "death" ? Math.max(0, 1 - animFrame * 0.05) : 1

    ctx.globalAlpha = deathFade

    const scale = type === "boss" ? 1.5 : type === "elite" ? 1.3 : type === "warrior" ? 1.1 : 1
    const px = hitShake

    // Wave drop glow
    if (hasDrop) {
      ctx.fillStyle = `rgba(255, 0, 255, ${0.3 + Math.sin(Date.now() * 0.005) * 0.2})`
      ctx.beginPath()
      ctx.ellipse(width / 2, height / 2 + walkBob, width * 0.8, height * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Body
    ctx.fillStyle = color
    ctx.fillRect(px + 6 * scale, 14 * scale + walkBob, 16 * scale, 20 * scale)

    // Sect symbol on chest
    ctx.fillStyle = "#000000"
    ctx.fillRect(px + 12 * scale, 18 * scale + walkBob, 4 * scale, 4 * scale)

    // Head
    ctx.fillStyle = "#e8c4a0"
    ctx.fillRect(px + 8 * scale, 4 * scale + walkBob, 12 * scale, 10 * scale)

    // Evil mask/face
    ctx.fillStyle = "#000000"
    ctx.fillRect(px + 10 * scale, 6 * scale + walkBob, 3 * scale, 3 * scale)
    ctx.fillRect(px + 15 * scale, 6 * scale + walkBob, 3 * scale, 3 * scale)
    ctx.fillRect(px + 12 * scale, 10 * scale + walkBob, 4 * scale, 2 * scale)

    // Legs
    ctx.fillStyle = "#333333"
    ctx.fillRect(px + 8 * scale, 34 * scale + walkBob, 4 * scale, 8 * scale)
    ctx.fillRect(px + 16 * scale, 34 * scale + walkBob, 4 * scale, 8 * scale)

    // Arms with weapons
    ctx.fillStyle = color
    ctx.fillRect(px + 2 * scale, 16 * scale + walkBob, 4 * scale, 10 * scale)
    ctx.fillRect(px + 22 * scale, 16 * scale + walkBob, 4 * scale, 10 * scale)

    // Weapon
    ctx.fillStyle = "#666666"
    ctx.fillRect(px + 24 * scale, 14 * scale + walkBob, 3 * scale, 16 * scale)

    // Boss crown
    if (type === "boss") {
      ctx.fillStyle = "#ffcc00"
      ctx.fillRect(px + 8 * scale, 0, 12 * scale, 4 * scale)
      ctx.fillRect(px + 10 * scale, -2 * scale, 2 * scale, 4 * scale)
      ctx.fillRect(px + 14 * scale, -3 * scale, 2 * scale, 5 * scale)
      ctx.fillRect(px + 18 * scale, -2 * scale, 2 * scale, 4 * scale)
    }

    // Elite aura
    if (type === "elite" || type === "boss") {
      ctx.fillStyle = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.3)`
      ctx.beginPath()
      ctx.ellipse(width / 2, height / 2 + walkBob, width * 0.7, height * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // HP bar
    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = "#333333"
      ctx.fillRect(0, -8, width, 4)
      ctx.fillStyle = enemy.hp > enemy.maxHp * 0.5 ? "#33ff33" : enemy.hp > enemy.maxHp * 0.25 ? "#ffff33" : "#ff3333"
      ctx.fillRect(0, -8, (enemy.hp / enemy.maxHp) * width, 4)
    }

    ctx.restore()
  }, [])

  // Draw merchant sprite
  const drawMerchant = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save()
    ctx.translate(x, y)
    
    const bob = Math.sin(Date.now() * 0.002) * 2
    
    // Merchant body (purple robes)
    ctx.fillStyle = "#4a2080"
    ctx.fillRect(8, 20 + bob, 24, 32)
    
    // Gold trim
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(6, 20 + bob, 2, 32)
    ctx.fillRect(32, 20 + bob, 2, 32)
    ctx.fillRect(8, 50 + bob, 24, 2)
    
    // Belt with pouches
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(6, 36 + bob, 28, 4)
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(8, 35 + bob, 6, 6)
    ctx.fillRect(26, 35 + bob, 6, 6)
    
    // Head
    ctx.fillStyle = "#ffd4b0"
    ctx.fillRect(12, 6 + bob, 16, 14)
    
    // Beard
    ctx.fillStyle = "#666666"
    ctx.fillRect(14, 16 + bob, 12, 8)
    ctx.fillRect(12, 18 + bob, 4, 10)
    ctx.fillRect(24, 18 + bob, 4, 10)
    
    // Eyes (wise squint)
    ctx.fillStyle = "#000000"
    ctx.fillRect(14, 10 + bob, 4, 2)
    ctx.fillRect(22, 10 + bob, 4, 2)
    
    // Hat/turban
    ctx.fillStyle = "#4a2080"
    ctx.fillRect(10, 2 + bob, 20, 6)
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(18, 0 + bob, 4, 8)
    // Jewel on turban
    ctx.fillStyle = "#ff3366"
    ctx.fillRect(19, 2 + bob, 2, 2)
    
    // Arms
    ctx.fillStyle = "#4a2080"
    ctx.fillRect(2, 22 + bob, 6, 16)
    ctx.fillRect(32, 22 + bob, 6, 16)
    
    // Hands holding items
    ctx.fillStyle = "#ffd4b0"
    ctx.fillRect(2, 36 + bob, 6, 4)
    ctx.fillRect(32, 36 + bob, 6, 4)
    
    // Item in hand (scroll)
    ctx.fillStyle = "#f5f5dc"
    ctx.fillRect(0, 34 + bob, 4, 8)
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(0, 33 + bob, 4, 2)
    ctx.fillRect(0, 41 + bob, 4, 2)
    
    ctx.restore()
  }, [])

  // Draw Beyond (legendary character)
  const drawBeyond = useCallback((ctx: CanvasRenderingContext2D, timer: number) => {
    const centerX = GAME_WIDTH / 2
    const centerY = GAME_HEIGHT / 3
    const pulse = Math.sin(Date.now() * 0.005) * 10

    // Massive aura
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200 + pulse)
    gradient.addColorStop(0, "rgba(255, 215, 0, 0.8)")
    gradient.addColorStop(0.5, "rgba(255, 100, 0, 0.4)")
    gradient.addColorStop(1, "rgba(255, 0, 0, 0)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 200 + pulse, 0, Math.PI * 2)
    ctx.fill()

    // Lightning effects
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Date.now() * 0.002
      ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + Math.random() * 0.5})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      let px = centerX, py = centerY
      for (let j = 0; j < 10; j++) {
        px += Math.cos(angle) * 20 + (Math.random() - 0.5) * 20
        py += Math.sin(angle) * 20 + (Math.random() - 0.5) * 20
        ctx.lineTo(px, py)
      }
      ctx.stroke()
    }

    // Beyond character - larger pixel art
    const scale = 3
    const bx = centerX - 16 * scale
    const by = centerY - 24 * scale

    // Flowing robes
    ctx.fillStyle = "#1a0a30"
    ctx.fillRect(bx + 8 * scale, 16 * scale + by, 16 * scale, 28 * scale)
    
    // Golden trim
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(bx + 6 * scale, 16 * scale + by, 2 * scale, 28 * scale)
    ctx.fillRect(bx + 24 * scale, 16 * scale + by, 2 * scale, 28 * scale)
    ctx.fillRect(bx + 8 * scale, 42 * scale + by, 16 * scale, 2 * scale)

    // Head with divine glow
    ctx.fillStyle = "#fff8e0"
    ctx.fillRect(bx + 10 * scale, 4 * scale + by, 12 * scale, 12 * scale)

    // Serene eyes
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(bx + 12 * scale, 8 * scale + by, 3 * scale, 2 * scale)
    ctx.fillRect(bx + 17 * scale, 8 * scale + by, 3 * scale, 2 * scale)

    // Long white hair
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(bx + 6 * scale, 2 * scale + by, 20 * scale, 6 * scale)
    ctx.fillRect(bx + 4 * scale, 6 * scale + by, 6 * scale, 20 * scale)
    ctx.fillRect(bx + 22 * scale, 6 * scale + by, 6 * scale, 20 * scale)

    // Crown/halo
    ctx.fillStyle = "#ffd700"
    ctx.beginPath()
    ctx.arc(centerX, by + 2 * scale, 18, 0, Math.PI * 2)
    ctx.stroke()

    // Divine sword
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(bx + 28 * scale, 10 * scale + by, 4 * scale, 40 * scale)
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(bx + 26 * scale, 20 * scale + by, 8 * scale, 4 * scale)

    // "BEYOND" text
    ctx.fillStyle = "#ffd700"
    ctx.font = "bold 32px serif"
    ctx.textAlign = "center"
    ctx.fillText("BEYOND", centerX, by - 20)
    ctx.font = "16px serif"
    ctx.fillText("Top Genius of the Realm", centerX, by - 2)

    // Countdown to wipe
    if (timer > 0) {
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 48px serif"
      ctx.fillText(Math.ceil(timer / 60).toString(), centerX, centerY + 150)
    }
  }, [])

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const deltaTime = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    const state = gameStateRef.current
    if (state.screen !== "game" || state.paused) {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
      return
    }

    const player = playerRef.current
    if (!player) {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
      return
    }

    // Update game time
    setGameState(prev => {
      const newTime = prev.time + deltaTime
      const newWave = Math.floor(newTime / 30000) + 1 // New wave every 30 seconds

      // Check for wave change - spawn wave drop enemy
      if (newWave > lastWaveRef.current && newWave > 1) {
        lastWaveRef.current = newWave
        // Spawn a special enemy with a drop
        setTimeout(() => spawnEnemy(true), 500)
      }

      // Check for Beyond arrival
      if (newTime >= BEYOND_ARRIVAL_TIME && !prev.beyondArrived) {
        return { ...prev, time: newTime, wave: newWave, beyondArrived: true, beyondTimer: 180 }
      }

      // Check victory
      if (newTime >= GAME_DURATION) {
        return { ...prev, screen: "victory", time: newTime }
      }

      // Update Beyond timer
      if (prev.beyondArrived && prev.beyondTimer > 0) {
        const newBeyondTimer = prev.beyondTimer - 1
        if (newBeyondTimer <= 0) {
          // Wipe all enemies
          enemiesRef.current = []
          particlesRef.current = []
          for (let i = 0; i < 100; i++) {
            particlesRef.current.push({
              x: Math.random() * GAME_WIDTH,
              y: Math.random() * GAME_HEIGHT,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 120,
              maxLife: 120,
              color: "#ffd700",
              size: 10 + Math.random() * 20,
              type: "energy",
            })
          }
        }
        return { ...prev, time: newTime, wave: newWave, beyondTimer: newBeyondTimer }
      }

      return { ...prev, time: newTime, wave: newWave }
    })

    // Player input handling
    const keys = keysRef.current
    const touch = touchRef.current
    let dx = 0, dy = 0

    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy -= 1
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy += 1

    // Touch/joystick movement
    if (touch.active) {
      const tdx = touch.x - (player.x + player.width / 2)
      const tdy = touch.y - (player.y + player.height / 2)
      const dist = Math.hypot(tdx, tdy)
      if (dist > 20) {
        dx = tdx / dist
        dy = tdy / dist
      }
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707
      dy *= 0.707
    }

    // Move player
    if (dx !== 0 || dy !== 0) {
      player.x += dx * player.speed
      player.y += dy * player.speed
      player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x))
      player.y = Math.max(50, Math.min(GAME_HEIGHT - player.height - 20, player.y))
      player.facing = dx > 0 ? "right" : dx < 0 ? "left" : player.facing
      if (player.state !== "attack" && player.state !== "hit") {
        player.state = "walk"
      }
    } else if (player.state === "walk") {
      player.state = "idle"
    }

    // Attack
    if (keys.has(" ") || keys.has("j") || keys.has("J")) {
      playerAttack()
    }

    // Abilities (1, 2, 3 keys)
    if (keys.has("1")) useAbility(0)
    if (keys.has("2")) useAbility(1)
    if (keys.has("3")) useAbility(2)

    // Inventory items (4, 5, 6 keys)
    if (keys.has("4")) useInventoryItem(0)
    if (keys.has("5")) useInventoryItem(1)
    if (keys.has("6")) useInventoryItem(2)

    // Update player
    player.animTimer++
    if (player.animTimer >= 8) {
      player.animTimer = 0
      player.animFrame++
    }
    if (player.attackCooldown > 0) player.attackCooldown--
    if (player.invincible > 0) player.invincible--

    // Berserk mode management
    if (player.berserkMode) {
      player.berserkCooldown--
      if (player.berserkCooldown <= 0) {
        player.berserkMode = false
        player.damage = player.baseDamage + (player.weapon ? player.weapon.stat : 0)
        player.speed = player.baseSpeed
        player.berserkCooldown = 1800 // 30 second cooldown
      }
      // Berserk particles
      if (Math.random() < 0.3) {
        createParticles(player.x + Math.random() * player.width, player.y + player.height, 1, "#ff0000", "aura")
      }
    } else if (player.berserkCooldown > 0) {
      player.berserkCooldown--
    }

    // Ability cooldowns
    player.abilityCooldowns = player.abilityCooldowns.map(cd => Math.max(0, cd - deltaTime))

    // Spawn enemies (only if Beyond hasn't arrived)
    if (!gameStateRef.current.beyondArrived) {
      const spawnRate = Math.max(30, 120 - gameStateRef.current.wave * 5)
      if (Math.random() < 1 / spawnRate) {
        spawnEnemy()
      }
    }

    // Update enemies
    enemiesRef.current = enemiesRef.current.filter(enemy => {
      if (enemy.state === "death") {
        enemy.animFrame++
        return enemy.animFrame < 30
      }

      // Knockback
      if (enemy.knockback.timer > 0) {
        enemy.x += enemy.knockback.x
        enemy.knockback.timer--
      }

      // Move towards player
      const edx = player.x - enemy.x
      const edy = player.y - enemy.y
      const dist = Math.hypot(edx, edy)

      if (dist > 40) {
        enemy.x += (edx / dist) * enemy.speed
        enemy.y += (edy / dist) * enemy.speed
        enemy.facing = edx > 0 ? "right" : "left"
        enemy.state = "walk"
      } else {
        // Attack player
        enemy.attackCooldown--
        if (enemy.attackCooldown <= 0) {
          enemy.state = "attack"
          enemy.attackCooldown = 60
          enemyAttack(enemy)
        }
      }

      // Animation
      enemy.animTimer++
      if (enemy.animTimer >= 10) {
        enemy.animTimer = 0
        enemy.animFrame++
      }

      // Keep in bounds
      enemy.x = Math.max(-50, Math.min(GAME_WIDTH + 50, enemy.x))
      enemy.y = Math.max(50, Math.min(GAME_HEIGHT - 50, enemy.y))

      return true
    })

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx
      p.y += p.vy
      if (p.type !== "skill" && p.type !== "lightning") {
        p.vy += 0.1 // gravity
      }
      p.life--
      return p.life > 0
    })

    // Update damage numbers
    damageNumbersRef.current = damageNumbersRef.current.filter(d => {
      d.y -= 1
      d.life--
      return d.life > 0
    })

    // Update screen shake
    setGameState(prev => {
      if (prev.screenShake.intensity > 0) {
        return {
          ...prev,
          screenShake: {
            x: (Math.random() - 0.5) * prev.screenShake.intensity,
            y: (Math.random() - 0.5) * prev.screenShake.intensity,
            intensity: prev.screenShake.intensity * 0.9,
          },
        }
      }
      return prev
    })

    // ============== RENDERING ==============
    ctx.save()
    ctx.translate(gameStateRef.current.screenShake.x, gameStateRef.current.screenShake.y)

    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    bgGradient.addColorStop(0, "#1a0a20")
    bgGradient.addColorStop(0.5, "#2a1530")
    bgGradient.addColorStop(1, "#0a0510")
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Ground
    ctx.fillStyle = "#2a1a30"
    ctx.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80)
    ctx.fillStyle = "#3a2a40"
    for (let i = 0; i < GAME_WIDTH; i += 40) {
      ctx.fillRect(i, GAME_HEIGHT - 80, 2, 80)
    }

    // Mountains in background
    ctx.fillStyle = "#1a0a20"
    ctx.beginPath()
    ctx.moveTo(0, GAME_HEIGHT - 80)
    ctx.lineTo(100, GAME_HEIGHT - 200)
    ctx.lineTo(200, GAME_HEIGHT - 120)
    ctx.lineTo(350, GAME_HEIGHT - 280)
    ctx.lineTo(500, GAME_HEIGHT - 150)
    ctx.lineTo(650, GAME_HEIGHT - 220)
    ctx.lineTo(800, GAME_HEIGHT - 100)
    ctx.lineTo(800, GAME_HEIGHT - 80)
    ctx.closePath()
    ctx.fill()

    // Moon
    ctx.fillStyle = "#ffeecc"
    ctx.beginPath()
    ctx.arc(650, 80, 40, 0, Math.PI * 2)
    ctx.fill()

    // Draw enemies
    enemiesRef.current.forEach(enemy => {
      drawPixelEnemy(ctx, enemy)
    })

    // Draw player
    drawPixelCharacter(
      ctx,
      player.x,
      player.y,
      player.width,
      player.height,
      player.colors,
      player.facing,
      player.state,
      player.animFrame,
      player.berserkMode,
      player.gender
    )

    // Draw player HP bar
    ctx.fillStyle = "#333333"
    ctx.fillRect(player.x - 5, player.y - 15, player.width + 10, 8)
    const hpColor = player.hp > player.maxHp * 0.5 ? "#33ff33" : player.hp > player.maxHp * 0.25 ? "#ffff33" : "#ff3333"
    ctx.fillStyle = hpColor
    ctx.fillRect(player.x - 5, player.y - 15, ((player.hp / player.maxHp) * (player.width + 10)), 8)

    // Berserk indicator
    if (player.berserkMode) {
      ctx.fillStyle = "#ff0000"
      ctx.font = "bold 12px monospace"
      ctx.textAlign = "center"
      ctx.fillText("BERSERK!", player.x + player.width / 2, player.y - 25)
    }

    // Draw particles
    particlesRef.current.forEach(p => {
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      
      if (p.type === "aura") {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === "trail") {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 2)
      } else if (p.type === "gold") {
        ctx.fillStyle = "#ffcc00"
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
        ctx.fillStyle = "#ffff00"
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
      } else if (p.type === "skill") {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
        // Glow effect
        ctx.globalAlpha = alpha * 0.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha * 1.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === "lightning") {
        ctx.strokeStyle = p.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + (Math.random() - 0.5) * 20, p.y + 20)
        ctx.stroke()
      } else if (p.type === "wave") {
        ctx.fillStyle = "#ff00ff"
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1 + (1 - alpha)), 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
      ctx.globalAlpha = 1
    })

    // Draw damage numbers
    damageNumbersRef.current.forEach(d => {
      ctx.globalAlpha = d.life / 60
      ctx.fillStyle = d.color
      ctx.font = d.isCrit ? "bold 24px monospace" : "bold 16px monospace"
      ctx.textAlign = "center"
      ctx.fillText(d.value.toString(), d.x, d.y)
      ctx.globalAlpha = 1
    })

    // Draw Beyond if arrived
    if (gameStateRef.current.beyondArrived) {
      drawBeyond(ctx, gameStateRef.current.beyondTimer)
    }

    // HUD
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(10, 10, 200, 100)
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px monospace"
    ctx.textAlign = "left"
    ctx.fillText(`${player.name}`, 20, 30)
    ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, 20, 48)
    ctx.fillText(`Gold: ${player.gold}`, 20, 66)
    ctx.fillText(`Wave: ${gameStateRef.current.wave}`, 20, 84)
    ctx.fillText(`Kills: ${gameStateRef.current.enemiesKilled}`, 20, 102)

    // Timer
    const timeLeft = Math.max(0, GAME_DURATION - gameStateRef.current.time)
    const minutes = Math.floor(timeLeft / 60000)
    const seconds = Math.floor((timeLeft % 60000) / 1000)
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(GAME_WIDTH / 2 - 50, 10, 100, 30)
    ctx.fillStyle = timeLeft < 60000 ? "#ff3333" : "#ffffff"
    ctx.font = "bold 20px monospace"
    ctx.textAlign = "center"
    ctx.fillText(`${minutes}:${seconds.toString().padStart(2, "0")}`, GAME_WIDTH / 2, 32)

    // Equipment display
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(GAME_WIDTH - 160, 10, 150, 80)
    ctx.fillStyle = "#ffffff"
    ctx.font = "12px monospace"
    ctx.textAlign = "left"
    ctx.fillText(`Weapon: ${player.weapon?.name || "None"}`, GAME_WIDTH - 150, 28)
    if (player.weapon) {
      ctx.fillText(`  Durability: ${player.weapon.durability}/${player.weapon.maxDurability}`, GAME_WIDTH - 150, 42)
    }
    ctx.fillText(`Armor: ${player.armor?.name || "None"}`, GAME_WIDTH - 150, 58)
    if (player.armor) {
      ctx.fillText(`  Durability: ${player.armor.durability}/${player.armor.maxDurability}`, GAME_WIDTH - 150, 72)
    }

    // Ability cooldowns
    if (player.abilities.length > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(10, GAME_HEIGHT - 70, player.abilities.length * 60, 60)
      player.abilities.forEach((ability, i) => {
        const cd = player.abilityCooldowns[i]
        const ready = cd <= 0
        const level = player.abilityLevels[i] || 1
        ctx.fillStyle = ready ? ability.color : "#333333"
        ctx.fillRect(15 + i * 60, GAME_HEIGHT - 65, 50, 50)
        ctx.fillStyle = "#ffffff"
        ctx.font = "10px monospace"
        ctx.textAlign = "center"
        ctx.fillText(ability.name.substring(0, 8), 40 + i * 60, GAME_HEIGHT - 45)
        ctx.fillText(`Lv.${level}`, 40 + i * 60, GAME_HEIGHT - 32)
        ctx.fillText(`[${i + 1}]`, 40 + i * 60, GAME_HEIGHT - 20)
        if (!ready) {
          ctx.fillText(`${Math.ceil(cd / 1000)}s`, 40 + i * 60, GAME_HEIGHT - 55)
        }
      })
    }

    // Inventory display
    if (player.inventory.length > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(GAME_WIDTH - 10 - player.inventory.length * 50, GAME_HEIGHT - 70, player.inventory.length * 50, 60)
      player.inventory.forEach((item, i) => {
        ctx.fillStyle = "#33ff33"
        ctx.fillRect(GAME_WIDTH - 5 - (player.inventory.length - i) * 50, GAME_HEIGHT - 65, 45, 50)
        ctx.fillStyle = "#000000"
        ctx.font = "9px monospace"
        ctx.textAlign = "center"
        ctx.fillText(item.name.substring(0, 6), GAME_WIDTH + 17 - (player.inventory.length - i) * 50, GAME_HEIGHT - 45)
        ctx.fillText(`[${i + 4}]`, GAME_WIDTH + 17 - (player.inventory.length - i) * 50, GAME_HEIGHT - 20)
      })
    }

    // Shop button
    ctx.fillStyle = "#ffcc00"
    ctx.fillRect(GAME_WIDTH - 80, GAME_HEIGHT - 50, 70, 40)
    ctx.fillStyle = "#000000"
    ctx.font = "bold 14px monospace"
    ctx.textAlign = "center"
    ctx.fillText("SHOP", GAME_WIDTH - 45, GAME_HEIGHT - 32)
    ctx.fillText("[E]", GAME_WIDTH - 45, GAME_HEIGHT - 18)

    // Save button
    ctx.fillStyle = "#3366ff"
    ctx.fillRect(GAME_WIDTH - 160, GAME_HEIGHT - 50, 70, 40)
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 14px monospace"
    ctx.textAlign = "center"
    ctx.fillText("SAVE", GAME_WIDTH - 125, GAME_HEIGHT - 32)
    ctx.fillText("[P]", GAME_WIDTH - 125, GAME_HEIGHT - 18)

    // Controls hint
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 25, 400, 20)
    ctx.fillStyle = "#aaaaaa"
    ctx.font = "10px monospace"
    ctx.textAlign = "center"
    ctx.fillText("WASD: Move | Space/J: Attack | 1-3: Skills | 4-6: Items | P: Save | E: Shop", GAME_WIDTH / 2, GAME_HEIGHT - 10)

    ctx.restore()

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [playerAttack, useAbility, useInventoryItem, enemyAttack, spawnEnemy, createParticles, drawPixelCharacter, drawPixelEnemy, drawBeyond])

  // Start game (goes to cinematic first)
  const startGame = useCallback(() => {
    initPlayer()
    setGameState(prev => ({
      ...prev,
      screen: "cinematic",
      cinematicStep: 0,
    }))
  }, [initPlayer])

  // Skip to near end for testing
  const skipToEnd = useCallback(() => {
    initPlayer()
    setGameState({
      screen: "game",
      time: SKIP_TIME,
      wave: Math.floor(SKIP_TIME / 30000) + 1,
      enemiesKilled: 0,
      beyondArrived: false,
      beyondTimer: 0,
      screenShake: { x: 0, y: 0, intensity: 0 },
      paused: false,
      cinematicStep: 0,
      waveDrop: null,
      showWaveDropChoice: false,
    })
    lastWaveRef.current = Math.floor(SKIP_TIME / 30000) + 1
  }, [initPlayer])

  // Continue cinematic
  const nextCinematicStep = useCallback(() => {
    setGameState(prev => {
      if (prev.cinematicStep >= CINEMATIC_TEXTS.length - 1) {
        return {
          ...prev,
          screen: "game",
          time: 0,
          wave: 1,
          enemiesKilled: 0,
          beyondArrived: false,
          beyondTimer: 0,
          screenShake: { x: 0, y: 0, intensity: 0 },
          paused: false,
          cinematicStep: 0,
        }
      }
      return { ...prev, cinematicStep: prev.cinematicStep + 1 }
    })
  }, [])

  // Open/close shop
  const toggleShop = useCallback(() => {
    setShopPrompt(null)
    setSelectedShopIndex(0)
    setGameState(prev => ({
      ...prev,
      screen: prev.screen === "shop" ? "game" : "shop",
      paused: prev.screen !== "shop",
    }))
  }, [])

  // Save game to file
  const saveGame = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    const shopPricesObj: Record<string, number> = {}
    shopPricesRef.current.forEach((value, key) => {
      shopPricesObj[key] = value
    })

    const saveData: SaveData = {
      version: 1,
      timestamp: Date.now(),
      character: {
        name: player.name,
        gender: player.gender,
        type: player.type,
        colors: player.colors,
      },
      player: {
        hp: player.hp,
        maxHp: player.maxHp,
        gold: player.gold,
        damage: player.damage,
        baseDamage: player.baseDamage,
        defense: player.defense,
        speed: player.speed,
        baseSpeed: player.baseSpeed,
        x: player.x,
        y: player.y,
        weapon: player.weapon,
        armor: player.armor,
        abilities: player.abilities,
        abilityLevels: player.abilityLevels,
        inventory: player.inventory,
      },
      gameState: {
        time: gameStateRef.current.time,
        wave: gameStateRef.current.wave,
        enemiesKilled: gameStateRef.current.enemiesKilled,
      },
      shopPrices: shopPricesObj,
    }

    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shp-alliance-save-${player.name || "disciple"}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  // Load game from file
  const loadGame = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target?.result as string) as SaveData

        if (saveData.version !== 1) {
          alert("Incompatible save file version!")
          return
        }

        // Set character creation state
        setCharName(saveData.character.name)
        setCharGender(saveData.character.gender)
        setCharType(saveData.character.type)
        setPrimaryColor(saveData.character.colors.primary)
        setSecondaryColor(saveData.character.colors.secondary)
        setAccentColor(saveData.character.colors.accent)

        // Initialize player with saved data
        playerRef.current = {
          x: saveData.player.x,
          y: saveData.player.y,
          width: 32,
          height: 48,
          hp: saveData.player.hp,
          maxHp: saveData.player.maxHp,
          speed: saveData.player.speed,
          baseSpeed: saveData.player.baseSpeed,
          damage: saveData.player.damage,
          baseDamage: saveData.player.baseDamage,
          defense: saveData.player.defense,
          gold: saveData.player.gold,
          name: saveData.character.name,
          gender: saveData.character.gender,
          type: saveData.character.type,
          colors: saveData.character.colors,
          berserkMode: false,
          berserkCooldown: 0,
          attackCooldown: 0,
          facing: "right",
          state: "idle",
          animFrame: 0,
          animTimer: 0,
          invincible: 0,
          weapon: saveData.player.weapon,
          armor: saveData.player.armor,
          manual: null,
          abilities: saveData.player.abilities || [],
          abilityLevels: saveData.player.abilityLevels || [],
          abilityCooldowns: (saveData.player.abilities || []).map(() => 0),
          inventory: saveData.player.inventory || [],
        }

        // Clear entities
        enemiesRef.current = []
        particlesRef.current = []
        damageNumbersRef.current = []

        // Restore shop prices
        shopPricesRef.current = new Map()
        Object.entries(saveData.shopPrices).forEach(([key, value]) => {
          shopPricesRef.current.set(key, value)
        })
        
        lastWaveRef.current = saveData.gameState.wave

        // Set game state
        setGameState({
          screen: "game",
          time: saveData.gameState.time,
          wave: saveData.gameState.wave,
          enemiesKilled: saveData.gameState.enemiesKilled,
          beyondArrived: saveData.gameState.time >= BEYOND_ARRIVAL_TIME,
          beyondTimer: 0,
          screenShake: { x: 0, y: 0, intensity: 0 },
          paused: false,
          cinematicStep: 0,
          waveDrop: null,
          showWaveDropChoice: false,
        })
      } catch {
        alert("Failed to load save file. The file may be corrupted.")
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      
      // Shop navigation
      if (gameStateRef.current.screen === "shop") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          setSelectedShopIndex(prev => Math.max(0, prev - 1))
        }
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          setSelectedShopIndex(prev => Math.min(SHOP_ITEMS.length - 1, prev + 1))
        }
        if (e.key === "Enter" || e.key === "b" || e.key === "B") {
          if (!shopPrompt) {
            initiatePurchase(SHOP_ITEMS[selectedShopIndex])
          }
        }
        if (e.key === "y" || e.key === "Y") {
          if (shopPrompt?.stage === "confirm") {
            const item = shopPrompt.item
            if (item.type === "consumable") {
              setShopPrompt({ ...shopPrompt, stage: "use_or_keep" })
            } else {
              confirmPurchase()
            }
          }
        }
        if (e.key === "n" || e.key === "N") {
          setShopPrompt(null)
        }
        if (e.key === "u" || e.key === "U") {
          if (shopPrompt?.stage === "use_or_keep") {
            confirmPurchase(true)
          }
        }
        if (e.key === "k" || e.key === "K") {
          if (shopPrompt?.stage === "use_or_keep") {
            confirmPurchase(false)
          }
        }
      }

      // Wave drop choice
      if (gameStateRef.current.showWaveDropChoice) {
        if (e.key === "Enter" || e.key === " ") {
          applyWaveDrop()
        }
      }

      // Cinematic
      if (gameStateRef.current.screen === "cinematic") {
        if (e.key === "Enter" || e.key === " ") {
          nextCinematicStep()
        }
      }
      
      if (e.key === "e" || e.key === "E") {
        if (gameStateRef.current.screen === "game" || gameStateRef.current.screen === "shop") {
          toggleShop()
        }
      }
      if (e.key === "p" || e.key === "P") {
        if (gameStateRef.current.screen === "game" || gameStateRef.current.screen === "shop") {
          saveGame()
        }
      }
      if (e.key === "Escape") {
        if (gameStateRef.current.screen === "shop") {
          setShopPrompt(null)
          toggleShop()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [toggleShop, saveGame, shopPrompt, selectedShopIndex, initiatePurchase, confirmPurchase, applyWaveDrop, nextCinematicStep])

  // Touch events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const scaleX = GAME_WIDTH / rect.width
      const scaleY = GAME_HEIGHT / rect.height
      const touch = e.touches[0]
      touchRef.current = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
        active: true,
      }

      // Check shop button tap
      if (touchRef.current.x > GAME_WIDTH - 80 && touchRef.current.y > GAME_HEIGHT - 50) {
        toggleShop()
      }
      // Check save button tap
      if (touchRef.current.x > GAME_WIDTH - 160 && touchRef.current.x < GAME_WIDTH - 90 && touchRef.current.y > GAME_HEIGHT - 50) {
        saveGame()
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const scaleX = GAME_WIDTH / rect.width
      const scaleY = GAME_HEIGHT / rect.height
      const touch = e.touches[0]
      touchRef.current = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
        active: true,
      }
    }

    const handleTouchEnd = () => {
      touchRef.current.active = false
      // Trigger attack on tap
      if (gameStateRef.current.screen === "game") {
        playerAttack()
      }
    }

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
    }
  }, [toggleShop, playerAttack, saveGame])

  // Game loop management
  useEffect(() => {
    if (gameState.screen === "game" || gameState.screen === "shop") {
      lastTimeRef.current = performance.now()
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState.screen, gameLoop])

  // Render cinematic
  if (gameState.screen === "cinematic") {
    const step = CINEMATIC_TEXTS[gameState.cinematicStep]
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="animate-pulse mb-8">
            <h2 className="text-3xl font-bold text-[#ffd700] mb-4" style={{ fontFamily: "serif" }}>
              {step.title}
            </h2>
            <p className="text-xl text-[#ffcc99] leading-relaxed">
              {step.text}
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-8">
            {CINEMATIC_TEXTS.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${i === gameState.cinematicStep ? "bg-[#ffd700]" : i < gameState.cinematicStep ? "bg-[#ffd700]/50" : "bg-[#333333]"}`}
              />
            ))}
          </div>

          <button
            onClick={nextCinematicStep}
            className="px-8 py-3 bg-gradient-to-r from-[#ffd700] to-[#ffaa00] text-[#1a0a20] font-bold rounded-lg text-lg hover:opacity-90 transition-opacity"
          >
            {gameState.cinematicStep >= CINEMATIC_TEXTS.length - 1 ? "Begin Battle" : "Continue"}
          </button>
          <p className="text-[#666666] text-sm mt-4">Press Enter or Space to continue</p>
        </div>
      </div>
    )
  }

  // Render menu screen
  if (gameState.screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a20] via-[#2a1530] to-[#0a0510] flex items-center justify-center p-4">
        <div className="bg-[#1a0a20]/90 border-2 border-[#ffd700] rounded-lg p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center text-[#ffd700] mb-2" style={{ fontFamily: "serif" }}>
            SHP Alliance
          </h1>
          <p className="text-center text-[#ffcc99] mb-6 text-sm">Survive 20 Minutes Until Beyond Arrives</p>

          <div className="space-y-4">
            <div>
              <label className="block text-[#ffcc99] mb-1 text-sm">Disciple Name</label>
              <input
                type="text"
                value={charName}
                onChange={e => setCharName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-[#2a1530] border border-[#ffd700]/50 rounded px-3 py-2 text-[#ffffff] placeholder-[#666666]"
              />
            </div>

            <div>
              <label className="block text-[#ffcc99] mb-1 text-sm">Gender</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCharGender("male")}
                  className={`flex-1 py-2 rounded border ${charGender === "male" ? "bg-[#ffd700] text-[#1a0a20] border-[#ffd700]" : "bg-transparent text-[#ffcc99] border-[#ffd700]/50"}`}
                >
                  Male
                </button>
                <button
                  onClick={() => setCharGender("female")}
                  className={`flex-1 py-2 rounded border ${charGender === "female" ? "bg-[#ffd700] text-[#1a0a20] border-[#ffd700]" : "bg-transparent text-[#ffcc99] border-[#ffd700]/50"}`}
                >
                  Female
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#ffcc99] mb-1 text-sm">Cultivation Path</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCharType("f2p")}
                  className={`flex-1 py-2 rounded border ${charType === "f2p" ? "bg-[#33ff66] text-[#1a0a20] border-[#33ff66]" : "bg-transparent text-[#ffcc99] border-[#33ff66]/50"}`}
                >
                  <div className="font-bold">F2P</div>
                  <div className="text-xs">Berserk Mode</div>
                </button>
                <button
                  onClick={() => setCharType("p2p")}
                  className={`flex-1 py-2 rounded border ${charType === "p2p" ? "bg-[#ff6633] text-[#1a0a20] border-[#ff6633]" : "bg-transparent text-[#ffcc99] border-[#ff6633]/50"}`}
                >
                  <div className="font-bold">P2P</div>
                  <div className="text-xs">+500 Gold Start</div>
                </button>
              </div>
              <p className="text-xs text-[#888888] mt-1">
                {charType === "f2p" 
                  ? "Strong base stats. Enter Berserk mode at low HP for massive power boost!"
                  : "Weak stats but start with 500 gold. Rely on the shop to survive!"}
              </p>
            </div>

            <div>
              <label className="block text-[#ffcc99] mb-1 text-sm">Robe Colors</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-[#888888]">Primary</label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#888888]">Secondary</label>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#888888]">Accent</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-3 bg-gradient-to-r from-[#ff3366] to-[#ff6633] text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity"
            >
              Enter the Battlefield
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-[#3366ff] text-white font-bold rounded hover:bg-[#4477ff] transition-colors"
              >
                Import Save
              </button>
              <button
                onClick={skipToEnd}
                className="flex-1 py-2 bg-[#ff9900] text-white font-bold rounded hover:bg-[#ffaa33] transition-colors"
              >
                Skip to 19:55
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={loadGame}
              className="hidden"
            />

            <div className="text-center text-[#888888] text-xs mt-4">
              <p>Controls: WASD/Arrows to move | Space/J to attack</p>
              <p>E to open shop | 1-3 for skills | 4-6 for items | P to save</p>
              <p>Mobile: Touch to move, tap to attack</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render wave drop choice overlay
  const renderWaveDropChoice = () => {
    if (!gameState.showWaveDropChoice || !gameState.waveDrop) return null
    const drop = gameState.waveDrop

    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
        <div className="bg-[#1a0a20] border-2 border-[#ff00ff] rounded-lg p-6 max-w-md w-full mx-4 text-center">
          <h2 className="text-2xl font-bold text-[#ff00ff] mb-4">Wave Drop!</h2>
          
          {drop.type === "stat" && drop.stat && (
            <div className="bg-[#2a1530] rounded p-4 mb-4">
              <p className="text-[#ffcc99] mb-2">You found a mysterious orb!</p>
              <p className="text-2xl text-[#33ff33] font-bold">{drop.stat.display}</p>
            </div>
          )}
          
          {drop.type === "skill" && drop.skill && (
            <div className="bg-[#2a1530] rounded p-4 mb-4">
              <p className="text-[#ffcc99] mb-2">You found a secret manual!</p>
              <p className="text-2xl font-bold" style={{ color: drop.skill.color }}>{drop.skill.name}</p>
              <p className="text-sm text-[#aaaaaa] mt-2">Damage: {drop.skill.damage} | Cooldown: {drop.skill.cooldown / 1000}s</p>
              <p className="text-xs text-[#ff9933] mt-1">Exclusive skill - not available in shop!</p>
            </div>
          )}

          <button
            onClick={applyWaveDrop}
            className="w-full py-3 bg-gradient-to-r from-[#ff00ff] to-[#9900ff] text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity"
          >
            Claim Reward [Enter]
          </button>
        </div>
      </div>
    )
  }

  // Render shop overlay
  const renderShop = () => {
    if (gameState.screen !== "shop") return null
    const player = playerRef.current
    if (!player) return null

    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
        <div className="bg-[#1a0a20] border-2 border-[#ffd700] rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-4">
              <div className="w-[40px] h-[60px] relative">
                <canvas
                  ref={(canvas) => {
                    if (canvas) {
                      const ctx = canvas.getContext("2d")
                      if (ctx) {
                        ctx.clearRect(0, 0, 40, 60)
                        drawMerchant(ctx, 0, 0)
                      }
                    }
                  }}
                  width={40}
                  height={60}
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#ffd700]">Wandering Merchant</h2>
                <p className="text-[#aaaaaa] text-sm italic">&quot;Finest wares for the brave cultivator...&quot;</p>
              </div>
            </div>
            <div className="text-[#ffcc00] font-bold text-xl">Gold: {player.gold}</div>
          </div>

          {/* Purchase prompt overlay */}
          {shopPrompt && (
            <div className="bg-[#2a1530] border border-[#ffd700] rounded p-4 mb-4">
              {shopPrompt.stage === "confirm" && (
                <>
                  <p className="text-[#ffffff] mb-2">
                    Purchase <span className="text-[#ffd700]">{shopPrompt.item.name}</span> for{" "}
                    <span className="text-[#ffcc00]">{shopPricesRef.current.get(shopPrompt.item.id) || shopPrompt.item.basePrice}g</span>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (shopPrompt.item.type === "consumable") {
                          setShopPrompt({ ...shopPrompt, stage: "use_or_keep" })
                        } else {
                          confirmPurchase()
                        }
                      }}
                      className="flex-1 py-2 bg-[#33ff33] text-[#1a0a20] font-bold rounded hover:opacity-90"
                    >
                      Yes [Y]
                    </button>
                    <button
                      onClick={() => setShopPrompt(null)}
                      className="flex-1 py-2 bg-[#ff3333] text-white font-bold rounded hover:opacity-90"
                    >
                      No [N]
                    </button>
                  </div>
                </>
              )}
              {shopPrompt.stage === "use_or_keep" && (
                <>
                  <p className="text-[#ffffff] mb-2">
                    Use <span className="text-[#33ff33]">{shopPrompt.item.name}</span> now or keep for later?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmPurchase(true)}
                      className="flex-1 py-2 bg-[#33ff33] text-[#1a0a20] font-bold rounded hover:opacity-90"
                    >
                      Use Now [U]
                    </button>
                    <button
                      onClick={() => confirmPurchase(false)}
                      className="flex-1 py-2 bg-[#3366ff] text-white font-bold rounded hover:opacity-90"
                    >
                      Keep [K]
                    </button>
                    <button
                      onClick={() => setShopPrompt(null)}
                      className="flex-1 py-2 bg-[#ff3333] text-white font-bold rounded hover:opacity-90"
                    >
                      Cancel [N]
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-[#888888] text-xs mb-2">Use Arrow Keys/WASD to navigate, [B] to buy, [Y/N] to confirm</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHOP_ITEMS.map((item, index) => {
              const currentPrice = shopPricesRef.current.get(item.id) || item.basePrice
              const canAfford = player.gold >= currentPrice
              const isSelected = index === selectedShopIndex
              const hasAbility = item.ability && player.abilities.some(a => a.id === item.ability!.id)
              const abilityLevel = hasAbility 
                ? player.abilityLevels[player.abilities.findIndex(a => a.id === item.ability!.id)] || 1
                : 0
              const rarityColors = {
                common: "#aaaaaa",
                rare: "#3399ff",
                epic: "#aa33ff",
                legendary: "#ff9933",
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedShopIndex(index)
                    if (canAfford) initiatePurchase(item)
                  }}
                  disabled={!canAfford && item.type !== "manual"}
                  className={`p-3 rounded border text-left transition-all ${
                    isSelected ? "border-[#ffd700] ring-2 ring-[#ffd700]/50" : "border-[#ffd700]/30"
                  } ${
                    canAfford 
                      ? "hover:border-[#ffd700] hover:bg-[#2a1530]" 
                      : !hasAbility ? "opacity-50 cursor-not-allowed" : "hover:bg-[#2a1530]"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold" style={{ color: rarityColors[item.rarity] }}>
                        {item.name}
                      </span>
                      <span className="text-xs text-[#888888] ml-2">[{item.type}]</span>
                      {hasAbility && (
                        <span className="text-xs text-[#33ff33] ml-2">[Owned Lv.{abilityLevel}]</span>
                      )}
                    </div>
                    <span className="text-[#ffcc00] font-bold">{currentPrice}g</span>
                  </div>
                  <p className="text-xs text-[#aaaaaa] mt-1">{item.description}</p>
                  {item.stat > 0 && (
                    <p className="text-xs text-[#33ff33] mt-1">
                      {item.type === "weapon" ? `+${item.stat} Damage` : item.type === "armor" ? `+${item.stat} Defense` : `+${item.stat} HP`}
                    </p>
                  )}
                  {item.durability && (
                    <p className="text-xs text-[#ff9933]">Durability: {item.maxDurability}</p>
                  )}
                  {item.ability && (
                    <p className="text-xs text-[#aa33ff]">
                      {hasAbility ? `Upgrade to Lv.${abilityLevel + 1}` : `Teaches: ${item.ability.name}`}
                    </p>
                  )}
                  {currentPrice > item.basePrice && (
                    <p className="text-xs text-[#ff3333]">Price increased!</p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Inventory display */}
          {player.inventory.length > 0 && (
            <div className="mt-4 p-3 bg-[#2a1530] rounded">
              <h3 className="text-[#ffcc99] font-bold mb-2">Inventory (use with 4-6 keys)</h3>
              <div className="flex gap-2 flex-wrap">
                {player.inventory.map((item, i) => (
                  <div key={i} className="px-3 py-1 bg-[#33ff33]/20 border border-[#33ff33]/50 rounded text-xs text-[#33ff33]">
                    {item.name} [{i + 4}]
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={saveGame}
              className="flex-1 py-2 bg-[#3366ff] text-white font-bold rounded hover:bg-[#4477ff] transition-colors"
            >
              Save Game [P]
            </button>
            <button
              onClick={toggleShop}
              className="flex-1 py-2 bg-[#ff3366] text-white font-bold rounded hover:bg-[#ff4477] transition-colors"
            >
              Close Shop [E / ESC]
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render game over screen
  if (gameState.screen === "gameover") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#300a10] via-[#200510] to-[#100005] flex items-center justify-center p-4">
        <div className="bg-[#1a0a10]/90 border-2 border-[#ff3333] rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-[#ff3333] mb-4">Fallen in Battle</h1>
          <p className="text-[#ffaaaa] mb-6">The enemy sects have overwhelmed the SHP Alliance...</p>
          
          <div className="bg-[#2a1520] rounded p-4 mb-6">
            <p className="text-[#ffffff]">Survived: {Math.floor(gameState.time / 60000)}m {Math.floor((gameState.time % 60000) / 1000)}s</p>
            <p className="text-[#ffffff]">Wave Reached: {gameState.wave}</p>
            <p className="text-[#ffffff]">Enemies Defeated: {gameState.enemiesKilled}</p>
          </div>

          <button
            onClick={() => setGameState(prev => ({ ...prev, screen: "menu" }))}
            className="w-full py-3 bg-gradient-to-r from-[#ff3366] to-[#ff6633] text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Render victory screen
  if (gameState.screen === "victory") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a2a10] via-[#102010] to-[#051005] flex items-center justify-center p-4">
        <div className="bg-[#0a1a0a]/90 border-2 border-[#ffd700] rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-[#ffd700] mb-2">VICTORY!</h1>
          <p className="text-[#ffcc99] mb-2">Beyond has descended and wiped out all enemies!</p>
          <p className="text-[#aaffaa] mb-6">The SHP Alliance stands victorious!</p>
          
          <div className="bg-[#1a2a1a] rounded p-4 mb-6">
            <p className="text-[#ffffff]">Total Enemies Defeated: {gameState.enemiesKilled}</p>
            <p className="text-[#ffffff]">Final Wave: {gameState.wave}</p>
            <p className="text-[#ffd700]">You have proven worthy!</p>
          </div>

          <button
            onClick={() => setGameState(prev => ({ ...prev, screen: "menu" }))}
            className="w-full py-3 bg-gradient-to-r from-[#33ff66] to-[#66ff33] text-[#1a0a20] font-bold rounded-lg text-lg hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
        </div>
      </div>
    )
  }

  // Render game screen
  return (
    <div className="min-h-screen bg-[#0a0510] flex items-center justify-center p-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-2 border-[#ffd700] rounded max-w-full"
          style={{ imageRendering: "pixelated" }}
        />
        {renderShop()}
        {renderWaveDropChoice()}
      </div>
    </div>
  )
}
