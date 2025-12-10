import { DbSchema } from '@/types';
import { INITIAL_WORKOUTS, INITIAL_GOALS, INITIAL_PROFILE, SHOE_OPTIONS } from '../constants';

// Generated Static DB State
export const STATIC_DB: DbSchema = {
  "version": "2024-05-23-initial",
  "workouts": [],
  "goals": [
    {
      "id": "g1",
      "name": "Sub-17 5K",
      "targetTime": "16:59",
      "targetDistance": 5,
      "currentBest": "17:45",
      "baseline": "18:45",
      "deadline": "2024-11-01"
    },
    {
      "id": "g2",
      "name": "Sub-4:15 1500m",
      "targetTime": "4:15",
      "targetDistance": 1.5,
      "currentBest": "4:28",
      "baseline": "4:45",
      "deadline": "2024-12-15"
    }
  ],
  "profile": {
    "name": "Yasith Hiruvinda",
    "age": 23,
    "weight": 51,
    "height": 169,
    "preferredRace": "5000m",
    "pbs": [
      {
        "distance": "5000m",
        "time": "17:37.67",
        "date": "2023-09-15"
      },
      {
        "distance": "1500m",
        "time": "4:30.44",
        "date": "2023-08-10"
      },
      {
        "distance": "10K",
        "time": "35:52.92"
      },
      {
        "distance": "3000m",
        "time": "10:22.00"
      }
    ],
    "injuryHistory": [],
    "weeklyAvailability": "",
    "targetPbs": "Sub-17 5K, Sub-4:15 1500m"
  },
  "courses": [],
  "seasons": [],
  "shoes": [
    {
      "id": "1765385715138",
      "name": "Adidas Adizero Evo SL",
      "brand": "Adidas",
      "model": "Adizero Evo SL",
      "purchaseDate": "2025-08-14",
      "status": "Active",
      "maxMileage": 400,
      "initialDistance": 155
    },
    {
      "id": "1765385800190",
      "name": "Adidas Adizero Takumi Sen 10",
      "brand": "Adidas",
      "model": "Adizero Takumi Sen 10",
      "purchaseDate": "2025-06-19",
      "status": "Active",
      "maxMileage": 350,
      "initialDistance": 71
    }
  ]
};