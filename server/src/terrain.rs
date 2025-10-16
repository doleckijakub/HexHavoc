use noise::{NoiseFn, OpenSimplex};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config::*;
use crate::model::{Entity, EntityType, Vec2};

pub struct OctavedNoise {
    base: OpenSimplex,
    octaves: u32,
    persistence: f64,
    lacunarity: f64,
    scale: f64,
}

impl OctavedNoise {
    pub fn new(seed: u32, octaves: u32, persistence: f64, lacunarity: f64, scale: f64) -> Self {
        Self {
            base: OpenSimplex::new(seed),
            octaves,
            persistence,
            lacunarity,
            scale,
        }
    }

    pub fn get(&self, x: f64, y: f64) -> f64 {
        let mut amplitude = 1.0;
        let mut frequency = 1.0;
        let mut total = 0.0;
        let mut max_amplitude = 0.0;

        for _ in 0..self.octaves {
            total += self
                .base
                .get([x * self.scale * frequency, y * self.scale * frequency])
                * amplitude;
            max_amplitude += amplitude;
            amplitude *= self.persistence;
            frequency *= self.lacunarity;
        }

        ((total / max_amplitude) + 1.0) / 2.0
    }
}

#[derive(Eq, Hash, PartialEq, Debug, Clone, Copy, Deserialize, Serialize)]
pub enum TileType {
    DeepWater,
    Water,
    Beach,
    Grass,
    Forest,
    Desert,
    Savanna,
    Tundra,
    Snow,
    Stone,
    Jungle,
    Swamp,
    Ice,
}

const ELEV_NOISE_SCALE: f64 = 0.04;
const ENV_NOISE_SCALE: f64 = 0.01;
const ENTITY_NOISE_SCALE: f64 = 1.0;

const DEEP_SEA_LEVEL: f64 = 0.40;
const SEA_LEVEL: f64 = 0.45;
const BEACH_LEVEL: f64 = 0.48;

pub struct TerrainGenerator {
    elev_noise: OctavedNoise,
    temp_noise: OctavedNoise,
    humid_noise: OctavedNoise,
    entity_noise: OctavedNoise,
}

impl TerrainGenerator {
    pub fn new(seed: u32) -> Self {
        Self {
            elev_noise: OctavedNoise::new(seed, 5, 0.5, 2.0, ELEV_NOISE_SCALE),
            temp_noise: OctavedNoise::new(seed.wrapping_add(420), 3, 0.5, 4.0, ENV_NOISE_SCALE),
            humid_noise: OctavedNoise::new(seed.wrapping_add(1337), 3, 0.5, 4.0, ENV_NOISE_SCALE),
            entity_noise: OctavedNoise::new(
                seed.wrapping_add(6969),
                4,
                0.5,
                2.0,
                ENTITY_NOISE_SCALE,
            ),
        }
    }

    fn get_tile_from_environment(&self, e: f64, t: f64, h: f64) -> TileType {
        match (t, h) {
            // Hot, Dry
            (t, h) if t > 0.55 && h < 0.5 => TileType::Desert,
            (t, h) if t > 0.55 && h < 0.6 => TileType::Savanna,
            (t, _) if t > 0.55 => TileType::Jungle,

            // Warm, moderate
            (t, h) if t > 0.5 && h < 0.6 => TileType::Grass,
            (t, _) if t > 0.5 => TileType::Forest,

            // Cool
            (t, h) if t > 0.3 && h < 0.35 => TileType::Tundra,
            (t, h) if t > 0.3 && h < 0.6 => TileType::Forest,
            (t, _) if t > 0.3 => TileType::Swamp,

            // Cold
            (t, h) if t > 0.1 && h < 0.1 => TileType::Tundra,

            _ => {
                if e > 0.55 {
                    TileType::Ice
                } else {
                    TileType::Snow
                }
            }
        }
    }

    fn get_tile(&self, x: f64, y: f64) -> TileType {
        const HWF: f64 = WORLD_SIZE as f64 / 2.0;
        const WATER_EDGE_SIZE_F: f64 = WATER_EDGE_SIZE as f64;

        let mut e = self.elev_noise.get(x, y);
        let s = (x - HWF).abs().max((y - HWF).abs()) - HWF + WATER_EDGE_SIZE_F;
        if s > 0.0 {
            e -= s / WATER_EDGE_SIZE_F;
        }

        let mut t = self.temp_noise.get(x, y);
        t = (t - (e - BEACH_LEVEL) * 0.6).clamp(0.0, 1.0);

        if e < DEEP_SEA_LEVEL {
            return TileType::DeepWater;
        };

        if e < SEA_LEVEL {
            return TileType::Water;
        };

        if e < BEACH_LEVEL {
            return TileType::Beach;
        };

        let mut h = self.humid_noise.get(x, y);
        let humidity_from_water = (1.0 - (e - SEA_LEVEL).abs() * 5.0).clamp(0.0, 1.0);
        h = (h * 0.6) + (humidity_from_water * 0.4);

        self.get_tile_from_environment(e, t, h)
    }

    fn should_spawn_entity(&self, x: f64, y: f64) -> bool {
        self.entity_noise.get(x, y) < WORLD_ENTITY_SPAWN_RATE
    }

    fn get_entity_from_tile(&self, x: f64, y: f64, tile: TileType) -> Option<Entity> {
        if !self.should_spawn_entity(x, y) {
            return None;
        }

        let entity_type = match tile {
            TileType::Forest => Some(EntityType::ForestTree),
            _ => None,
        };

        if let Some(ty) = entity_type {
            return Some(Entity::new(
                Uuid::new_v4(),
                Vec2::new(x as f32, y as f32),
                ty,
            ));
        }

        None
    }

    pub fn get_contents(&self, x: i32, y: i32) -> (TileType, Option<Entity>) {
        let x = x as f64;
        let y = y as f64;

        let tile = self.get_tile(x, y);
        let entity = self.get_entity_from_tile(x, y, tile);

        (tile, entity)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerrainChunk {
    pub position: Vec2,
    pub contents: Vec<TileType>,
}
