use noise::{NoiseFn, OpenSimplex};
use serde::{Deserialize, Serialize};

use crate::config::*;
use crate::model::Vec2;

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
            total += self.base.get([x * self.scale * frequency, y * self.scale * frequency]) * amplitude;
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

const ELEV_NOISE_SCALE: f64   = 0.04;
const OTHER_NOISES_SCALE: f64 = 0.01;

const DEEP_SEA_LEVEL: f64 = 0.40;
const SEA_LEVEL: f64      = 0.45;
const BEACH_LEVEL: f64    = 0.48;

pub struct TerrainGenerator {
    elev_noise: OctavedNoise,  // elevation
    temp_noise: OctavedNoise,  // temperature
    humid_noise: OctavedNoise, // humidity
}

impl TerrainGenerator {
    pub fn new(seed: u32) -> Self {
        Self {
            elev_noise: OctavedNoise::new(seed, 5, 0.5, 2.0, ELEV_NOISE_SCALE),
            temp_noise: OctavedNoise::new(seed.wrapping_add(420), 3, 0.5, 4.0, OTHER_NOISES_SCALE),
            humid_noise: OctavedNoise::new(seed.wrapping_add(1337), 3, 0.5, 4.0, OTHER_NOISES_SCALE),
        }
    }

    pub fn get_tile_from_environment(&self, e: f64, t: f64, h: f64) -> TileType {
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

            _ => if e > 0.55 { TileType::Ice } else { TileType::Snow },
        }
    }

    pub fn get_tile(&self, x: f64, y: f64) -> TileType {
        const HWF: f64 = WORLD_SIZE as f64 / 2.0;
        const WATER_EDGE_SIZE: f64 = 128.0;

        let mut e = self.elev_noise.get(x, y);
        let s = (x - HWF).abs().max((y - HWF).abs()) - HWF + WATER_EDGE_SIZE;
        if s > 0.0 { e -= s / WATER_EDGE_SIZE; }

        let mut t = self.temp_noise.get(x, y);
        t = (t - (e - BEACH_LEVEL) * 0.6).clamp(0.0, 1.0);

        // TEMPORARY
        if e < DEEP_SEA_LEVEL { return TileType::DeepWater };
        if e < SEA_LEVEL { return TileType::Water };
        if e < BEACH_LEVEL { return TileType::Beach };

        let mut h = self.humid_noise.get(x, y);
        let humidity_from_water = (1.0 - (e - SEA_LEVEL).abs() * 5.0).clamp(0.0, 1.0);
        h = (h * 0.6) + (humidity_from_water * 0.4);

        self.get_tile_from_environment(e, t, h)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerrainChunk {
    pub position: Vec2,
    pub contents: Vec<TileType>,
}