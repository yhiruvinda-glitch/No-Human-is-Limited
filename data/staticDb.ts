import { DbSchema, WorkoutType } from '../types';
import { INITIAL_WORKOUTS, INITIAL_GOALS, INITIAL_PROFILE, SHOE_OPTIONS } from '../constants';

// Generated Static DB State
export const STATIC_DB: DbSchema = {
  "version": "2024-05-23-initial",
  "workouts": [
    {
      "id": "1765390978212",
      "date": "2025-09-29T00:00:00.000Z",
      "type": WorkoutType.THRESHOLD,
      "distance": 3,
      "duration": 10.56,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [
        {
          "reps": 1,
          "distance": 1000,
          "duration": "3:34.2",
          "recovery": "90s",
          "pace": "03:34.2"
        },
        {
          "reps": 1,
          "distance": 1000,
          "duration": "3:29.4",
          "recovery": "90s",
          "pace": "03:29.4"
        },
        {
          "reps": 1,
          "distance": 1000,
          "duration": "3:30.0",
          "recovery": "90s",
          "pace": "03:30.0"
        }
      ],
      "splits": [
        214.2,
        209.4,
        210
      ],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "",
      "surface": "Track",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Threshold 1",
      "isSb": true
    },
    {
      "id": "1765390874412",
      "date": "2025-11-11T00:00:00.000Z",
      "type": WorkoutType.SPEED,
      "distance": 1,
      "duration": 2.51,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [
        {
          "reps": 1,
          "distance": 100,
          "duration": "15.3",
          "recovery": "90s",
          "pace": "02:33.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "15.4",
          "recovery": "90s",
          "pace": "02:34.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "15.0",
          "recovery": "90s",
          "pace": "02:30.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "15.0",
          "recovery": "90s",
          "pace": "02:30.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "15.0",
          "recovery": "90s",
          "pace": "02:30.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "15.1",
          "recovery": "90s",
          "pace": "02:31.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "14.9",
          "recovery": "90s",
          "pace": "02:29.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "15.3",
          "recovery": "90s",
          "pace": "02:33.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "14.8",
          "recovery": "90s",
          "pace": "02:28.0"
        },
        {
          "reps": 1,
          "distance": 100,
          "duration": "14.8",
          "recovery": "90s",
          "pace": "02:28.0"
        }
      ],
      "splits": [
        15.3,
        15.4,
        15,
        15,
        15,
        15.1,
        14.9,
        15.3,
        14.8,
        14.8
      ],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "",
      "surface": "Track",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Speed Work 1",
      "isSb": true
    },
    {
      "id": "1765390333603",
      "date": "2025-11-18T00:00:00.000Z",
      "type": WorkoutType.EASY,
      "distance": 0.8,
      "duration": 4.333333333333333,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Easy Run 5",
      "isSb": true
    },
    {
      "id": "1765390604930",
      "date": "2025-11-16T00:00:00.000Z",
      "type": WorkoutType.TEMPO,
      "distance": 7.1,
      "duration": 28.976666666666667,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "1765390012761",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Road Tempo 3",
      "isSb": true
    },
    {
      "id": "1765390289740",
      "date": "2025-11-13T00:00:00.000Z",
      "type": WorkoutType.EASY,
      "distance": 4.4,
      "duration": 22.916666666666668,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Easy Run 4"
    },
    {
      "id": "1765390206466",
      "date": "2025-10-31T00:00:00.000Z",
      "type": WorkoutType.EASY,
      "distance": 4.3,
      "duration": 20.716666666666665,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Easy Run 3"
    },
    {
      "id": "1765390533243",
      "date": "2025-10-13T00:00:00.000Z",
      "type": WorkoutType.TEMPO,
      "distance": 4.3,
      "duration": 16.475,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "1765389136768",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Road Tempo 2",
      "isSb": true
    },
    {
      "id": "1765390164181",
      "date": "2025-10-11T00:00:00.000Z",
      "type": WorkoutType.EASY,
      "distance": 2.5,
      "duration": 12,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Easy Run 2"
    },
    {
      "id": "1765390444151",
      "date": "2025-10-01T00:00:00.000Z",
      "type": WorkoutType.TEMPO,
      "distance": 4.3,
      "duration": 16.588333333333335,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "1765389136768",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Road Tempo 1",
      "isSb": true
    },
    {
      "id": "1765390096484",
      "date": "2025-09-28T00:00:00.000Z",
      "type": WorkoutType.EASY,
      "distance": 5.2,
      "duration": 22.366666666666667,
      "feeling": 5,
      "rpe": 5,
      "trainingLoad": 0,
      "notes": "",
      "intervals": [],
      "splits": [],
      "shoe": "Adidas Adizero Evo SL",
      "route": "UOP",
      "courseId": "",
      "surface": "Road",
      "competition": "",
      "team": "",
      "place": "",
      "eventName": "",
      "title": "Easy Run 1"
    }
  ],
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
        "time": "09:46.20",
        "date": "2025-10-07T00:00:00.000Z"
      }
    ],
    "injuryHistory": [],
    "weeklyAvailability": "",
    "targetPbs": "Sub-17 5K, Sub-4:15 1500m"
  },
  "courses": [
    {
      "name": "Pera Road Race Short Course",
      "distance": 4.3,
      "location": "UOP",
      "surface": "Road",
      "description": "Ground - Uda Peradeniya Rd - Gal Palama - University Temple - Marcus - Hilda - Art Theatre - Alwis Pond - Ground",
      "elevationGain": 90,
      "id": "1765389136768",
      "bestEffort": {
        "seconds": 988.5000000000001,
        "formattedTime": "16:28.50",
        "date": "2025-10-13T00:00:00.000Z",
        "workoutId": "1765390533243"
      }
    },
    {
      "name": "Pera Road Race Long Course",
      "distance": 7.1,
      "location": "UOP",
      "surface": "Road",
      "description": "Ground - Uda Peradeniya Rd - Gal Palama - University Temple - Marcus - Ramanadan - Turn back from Hindagala Junction - Hilda - Art Theatre - Alwis Pond - Ground",
      "elevationGain": 120,
      "id": "1765390012761",
      "bestEffort": {
        "seconds": 1738.6,
        "formattedTime": "28:58.60",
        "date": "2025-11-16T00:00:00.000Z",
        "workoutId": "1765390604930"
      }
    }
  ],
  "seasons": [
    {
      "id": "1765388919909",
      "name": "2026",
      "startDate": "2025-09-28T00:00:00.000Z",
      "startPbs": [
        {
          "distance": "1500m",
          "time": "4:30.44"
        },
        {
          "distance": "3000m",
          "time": "10:22.00"
        },
        {
          "distance": "5000m",
          "time": "17:37.67"
        },
        {
          "distance": "10K",
          "time": "35:52.92"
        }
      ],
      "targetPbs": [
        {
          "distance": "1500m",
          "time": "4:15"
        },
        {
          "distance": "3000m",
          "time": "9:45"
        },
        {
          "distance": "5000m",
          "time": "16:40"
        },
        {
          "distance": "10K",
          "time": "35:30"
        },
        {
          "distance": "Half Marathon",
          "time": "80:00"
        }
      ],
      "isActive": true
    }
  ],
  "shoes": [
    {
      "id": "1765389827383",
      "name": "Adidas Adizero Takumi Sen 10",
      "brand": "Adidas",
      "model": "Adizero Takumi Sen 10",
      "purchaseDate": "2025-06-19",
      "status": "Active",
      "maxMileage": 350,
      "initialDistance": 66
    },
    {
      "id": "1765389867908",
      "name": "Adidas Adizero Evo SL",
      "brand": "Adidas",
      "model": "Adizero Evo SL",
      "purchaseDate": "2025-08-14",
      "status": "Active",
      "maxMileage": 400,
      "initialDistance": 78
    }
  ]
};