import { useState, useEffect, useCallback } from 'react';
import { STATIC_DB } from '../data/staticDb';
import { DbSchema } from '../types';

const STORAGE_KEY = 'nhil_hardwired_db';

export const useData = () => {
  const [data, setData] = useState<DbSchema | null>(null);

  useEffect(() => {
    const loadData = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed: DbSchema = JSON.parse(stored);
                // Version Check: If STATIC_DB is newer, wipe local storage
                if (parsed.version !== STATIC_DB.version) {
                    console.info(`Version mismatch (Local: ${parsed.version} vs Static: ${STATIC_DB.version}). Upgrading to Static DB.`);
                    updateLocalStorage(STATIC_DB);
                    setData(STATIC_DB);
                } else {
                    console.info("Version match. Loading local data.");
                    setData(parsed);
                }
            } catch (e) {
                console.error("Data corruption. Resetting to static.", e);
                updateLocalStorage(STATIC_DB);
                setData(STATIC_DB);
            }
        } else {
            console.info("No local data. Initializing Static DB.");
            updateLocalStorage(STATIC_DB);
            setData(STATIC_DB);
        }
    };
    loadData();
  }, []);

  const updateLocalStorage = (newData: DbSchema) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      } catch (e) {
          console.error("Failed to save to localStorage", e);
      }
  };

  const save = useCallback((newData: DbSchema) => {
      setData(newData);
      updateLocalStorage(newData);
  }, []);

  const exportSourceCode = useCallback(() => {
      if (!data) return '';
      // Generates code to copy-paste back into src/data/staticDb.ts
      // Using 'as unknown as DbSchema' bypasses strict Enum vs String literal checks in TS
      return `import { DbSchema } from '../types';\n\n// Generated Static DB State\nexport const STATIC_DB: DbSchema = ${JSON.stringify(data, null, 2)} as unknown as DbSchema;`;
  }, [data]);

  return {
      data,
      save,
      exportSourceCode
  };
};