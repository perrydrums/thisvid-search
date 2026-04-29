import React, { useEffect, useState } from 'react';

import '../../components/v2/tokens.css';
import { RangeSlider } from '../../components/v2/atoms/RangeSlider';
import { Button } from '../../components/v2/atoms/Button';
import { ChipInput } from '../../components/v2/molecules/ChipInput';
import { AppSidebar } from '../../components/v2/organisms/AppSidebar';
import { TopNav } from '../../components/v2/organisms/TopNav';

import chrome from '../../components/v2/V2Chrome.module.css';

import styles from './Moods.module.css';
import type { Mood, Preferences as PreferencesType } from '../../helpers/types';

const emptyPrefs = (): PreferencesType => ({
  tags: [],
  excludeTags: [],
  boosterTags: [],
  diminishingTags: [],
  minDuration: 0,
});

function loadStoredMoods(): Mood[] {
  try {
    const raw = localStorage.getItem('tvass-moods');
    return raw ? (JSON.parse(raw) as Mood[]) : [];
  } catch {
    return [];
  }
}

function saveMoods(moods: Mood[]) {
  localStorage.setItem('tvass-moods', JSON.stringify(moods));
}

const MoodsPage = () => {
  const [moods, setMoods] = useState<Mood[]>(() => loadStoredMoods());
  const [activeName, setActiveName] = useState('');
  const [preferences, setPreferences] = useState<PreferencesType>(emptyPrefs());
  const [newMoodName, setNewMoodName] = useState('');


  useEffect(() => {
    if (!activeName) {
      setPreferences(emptyPrefs());
      return;
    }
    const mood = moods.find((mo) => mo.name === activeName);
    if (!mood?.preferences) {
      setPreferences(emptyPrefs());
      return;
    }
    const p = mood.preferences as PreferencesType;
    setPreferences({
      tags: p.tags || [],
      excludeTags: p.excludeTags || [],
      boosterTags: p.boosterTags || [],
      diminishingTags: p.diminishingTags || [],
      minDuration:
        typeof p.minDuration === 'number' ? p.minDuration : parseInt(String(p.minDuration ?? 0), 10) || 0,
    });
  }, [activeName, moods]);

  const durationLabel =
    preferences.minDuration >= 60
      ? `${Math.floor(preferences.minDuration / 60)}h${preferences.minDuration % 60}m`
      : `${preferences.minDuration}m`;

  const discard = () => {
    const m = moods.find((x) => x.name === activeName);
    if (!m?.preferences) return setPreferences(emptyPrefs());
    const p = m.preferences as PreferencesType;
    setPreferences({
      tags: p.tags || [],
      excludeTags: p.excludeTags || [],
      boosterTags: p.boosterTags || [],
      diminishingTags: p.diminishingTags || [],
      minDuration: typeof p.minDuration === 'number' ? p.minDuration : Number(p.minDuration) || 0,
    });
  };

  const saveMood = () => {
    if (!activeName) return;
    const next = moods.map((mo) =>
      mo.name === activeName
        ? {
            ...mo,
            preferences: {
              ...preferences,
            },
          }
        : mo,
    );
    setMoods(next);
    saveMoods(next);
  };

  const addMood = () => {
    const name = newMoodName.trim();
    if (!name || moods.some((m) => m.name === name)) return;
    const mood: Mood = { name, preferences: emptyPrefs() };
    const next = [...moods, mood];
    setMoods(next);
    saveMoods(next);
    setNewMoodName('');
    setActiveName(name);
  };

  const deleteMood = () => {
    if (!activeName) return;
    if (!window.confirm(`Delete mood “${activeName}”?`)) return;
    const next = moods.filter((m) => m.name !== activeName);
    setMoods(next);
    saveMoods(next);
    setActiveName('');
  };

  const setPref = <K extends keyof PreferencesType>(key: K, val: PreferencesType[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className={`v2-root ${chrome.page}`}>
      <TopNav />
      <AppSidebar activePage="moods" />

      <main className={`${chrome.main} ${styles.shell}`}>
        <div className={styles.cols}>
          <section className={styles.left}>
            <div className={styles.card}>
              <div className={styles.cardHd}>
                <h2 className={styles.cardHdTitle}>Existing moods</h2>
                <span className={styles.countBadge}>{moods.length} moods</span>
              </div>
              <div className={styles.addRow}>
                <input
                  className={styles.input}
                  placeholder="New mood name…"
                  value={newMoodName}
                  onChange={(e) => setNewMoodName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMood()}
                />
                <Button type="button" variant="primary" size="medium" aria-label="Add mood" className={styles.iconOnly} onClick={addMood}>
                  <span className="material-symbols-outlined">add</span>
                </Button>
              </div>
              <ul className={styles.moodUl}>
                {moods.map((mo) => {
                  const sel = mo.name === activeName;
                  return (
                    <li key={mo.name} className={styles.liRow}>
                      <button
                        type="button"
                        className={[styles.moodRow, sel ? styles.moodSel : ''].filter(Boolean).join(' ')}
                        onClick={() => setActiveName(mo.name)}
                      >
                        {mo.name}
                      </button>
                      {sel && (
                        <button
                          type="button"
                          className={styles.delBtn}
                          aria-label={`Delete ${mo.name}`}
                          title="Delete mood"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMood();
                          }}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className={styles.note}>
              <h4 className={styles.noteTitle}>What are moods?</h4>
              <p className={styles.noteText}>
                Moods are saved tag presets (include, exclude, boost, diminish, and minimum duration). When you pick a mood on the
                search page, those defaults apply to new searches. They are stored locally in your browser as{' '}
                <code>tvass-moods</code>.
              </p>
            </div>
          </section>

          <section className={`${styles.right} ${styles.card}`}>
            {activeName ? (
              <>
                <div className={styles.editorHead}>
                  <div>
                    <h2 className={styles.editorH2}>
                      Mood Editor:{' '}
                      <span className={styles.accent}>{activeName}</span>
                    </h2>
                    <p className={styles.editorSub}>Configure tag defaults for this mood profile.</p>
                  </div>
                  <div className={styles.btns}>
                    <Button variant="secondary" size="medium" type="button" onClick={discard}>
                      Discard Changes
                    </Button>
                    <Button variant="primary" size="medium" type="button" onClick={saveMood}>
                      Save Mood
                    </Button>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.fieldBlock}>
                    <span className={styles.lab}>Primary Search Terms</span>
                    <ChipInput tags={preferences.tags || []} onTagsChange={(t) => setPref('tags', t)} placeholder="Add term…" chipVariant="primary" />
                  </div>
                  <div className={styles.fieldBlock}>
                    <span className={styles.lab}>Exclude Terms</span>
                    <ChipInput tags={preferences.excludeTags || []} onTagsChange={(t) => setPref('excludeTags', t)} placeholder="Add term…" chipVariant="neutral" />
                  </div>
                  <div className={styles.fieldBlock}>
                    <span className={styles.lab}>Boost Priority Terms</span>
                    <ChipInput tags={preferences.boosterTags || []} onTagsChange={(t) => setPref('boosterTags', t)} placeholder="Add term…" chipVariant="tertiary" />
                  </div>
                  <div className={styles.fieldBlock}>
                    <span className={styles.lab}>Diminish Priority Terms</span>
                    <ChipInput tags={preferences.diminishingTags || []} onTagsChange={(t) => setPref('diminishingTags', t)} placeholder="Add term…" chipVariant="neutral" />
                  </div>
                </div>

                <div className={styles.sliderBlock}>
                  <div className={styles.sliderRow}>
                    <span className={styles.lab}>Minimum Video Duration</span>
                    <span className={styles.dur}>{durationLabel}</span>
                  </div>
                  <RangeSlider id="moods-min-duration" max={180} value={preferences.minDuration || 0} onChange={(n) => setPref('minDuration', n)} />
                  <div className={styles.ticks}>
                    <span>Short (0m)</span>
                    <span>Medium (15m)</span>
                    <span>Long (60m+)</span>
                  </div>
                </div>

              </>
            ) : (
              <p className={styles.empty}>Select or create a mood to edit preferences.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default MoodsPage;
