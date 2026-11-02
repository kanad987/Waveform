import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Sparkles,
  HelpCircle,
  Volume2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Star,
  Award,
} from 'lucide-react';
import { ACADEMY_CHAPTERS } from '../utils/academyCurriculum';
import type { AcademyChapter, AcademyLesson } from '../utils/academyCurriculum';
import type { ActiveNoteInfo } from '../utils/musicTheory';

interface PianoAcademyProps {
  activeNotes: ActiveNoteInfo[];
  onPlayTargetChord: (midiNotes: number[]) => void;
  onSetHintNotes: (notes: number[]) => void;
}

const STORAGE_KEY_PROGRESS = 'wavey_academy_progress_v1';
const STORAGE_KEY_STARS = 'wavey_academy_stars_v1';

export const PianoAcademy: React.FC<PianoAcademyProps> = ({
  activeNotes,
  onPlayTargetChord,
  onSetHintNotes,
}) => {
  // Saved progress: array of completed lesson IDs
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Star ratings map: lessonId -> 2 or 3 stars
  const [starsMap, setStarsMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STARS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Current Chapter & Lesson selection
  const [activeChapterId, setActiveChapterId] = useState<1 | 2 | 3>(1);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);

  // Hint toggle state
  const [isHintActive, setIsHintActive] = useState<boolean>(false);

  // Success state for current lesson
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showChapterModal, setShowChapterModal] = useState<boolean>(false);

  // Confetti particles state
  const [confettiActive, setConfettiActive] = useState<boolean>(false);

  const activeChapter: AcademyChapter =
    ACADEMY_CHAPTERS.find((c) => c.id === activeChapterId) || ACADEMY_CHAPTERS[0];
  const currentLesson: AcademyLesson =
    activeChapter.lessons[currentLessonIndex] || activeChapter.lessons[0];

  // Save to localStorage whenever progress updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(completedLessonIds));
      localStorage.setItem(STORAGE_KEY_STARS, JSON.stringify(starsMap));
    } catch {
      // ignore storage errors
    }
  }, [completedLessonIds, starsMap]);

  // Update piano keyboard hints when hint is toggled or lesson changes
  useEffect(() => {
    if (isHintActive && currentLesson) {
      onSetHintNotes(currentLesson.targetMidiNotes);
    } else {
      onSetHintNotes([]);
    }
  }, [isHintActive, currentLesson, onSetHintNotes]);

  // Reset hint state and success state when changing lessons
  const selectLesson = (index: number) => {
    setCurrentLessonIndex(index);
    setIsHintActive(false);
    setIsSuccess(false);
    onSetHintNotes([]);
  };

  const selectChapter = (chapterId: 1 | 2 | 3) => {
    setActiveChapterId(chapterId);
    setCurrentLessonIndex(0);
    setIsHintActive(false);
    setIsSuccess(false);
    onSetHintNotes([]);
  };

  // Real-time verification: check if ALL required pitch classes are currently sounding simultaneously
  const hasTriggeredSuccess = useRef(false);

  useEffect(() => {
    if (!currentLesson || isSuccess || hasTriggeredSuccess.current) return;

    // Check if every target pitch class is present in activeNotes
    const activePitchClassSet = new Set(activeNotes.map((n) => n.pitchClass));
    const allPresent = currentLesson.targetPitchClasses.every((pc) =>
      activePitchClassSet.has(pc)
    );

    if (allPresent && activeNotes.length >= currentLesson.targetPitchClasses.length) {
      hasTriggeredSuccess.current = true;
      const earnedStars = isHintActive ? 2 : 3;

      // Defer state updates to avoid synchronous setState inside render effect
      setTimeout(() => {
        setIsSuccess(true);
        setConfettiActive(true);

        // Update progress
        setCompletedLessonIds((prev) =>
          prev.includes(currentLesson.id) ? prev : [...prev, currentLesson.id]
        );
        setStarsMap((prev) => ({
          ...prev,
          [currentLesson.id]: Math.max(prev[currentLesson.id] || 0, earnedStars),
        }));

        // Turn off confetti after 3.5 seconds
        setTimeout(() => setConfettiActive(false), 3500);

        // Check if this was the last lesson in chapter
        if (currentLessonIndex === activeChapter.lessons.length - 1) {
          setTimeout(() => setShowChapterModal(true), 1200);
        }
      }, 0);
    }
  }, [activeNotes, currentLesson, isHintActive, isSuccess, currentLessonIndex, activeChapter]);

  // Reset success guard when lesson changes
  useEffect(() => {
    hasTriggeredSuccess.current = false;
  }, [currentLessonIndex, activeChapterId]);

  // Advance to next lesson
  const handleNextLesson = () => {
    if (currentLessonIndex < activeChapter.lessons.length - 1) {
      selectLesson(currentLessonIndex + 1);
    } else if (activeChapterId < 3) {
      selectChapter((activeChapterId + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      selectLesson(currentLessonIndex - 1);
    }
  };

  const handleResetProgress = () => {
    if (window.confirm('Reset all Piano Academy lesson progress and stars?')) {
      setCompletedLessonIds([]);
      setStarsMap({});
      localStorage.removeItem(STORAGE_KEY_PROGRESS);
      localStorage.removeItem(STORAGE_KEY_STARS);
      setCurrentLessonIndex(0);
      setIsSuccess(false);
      setIsHintActive(false);
      onSetHintNotes([]);
    }
  };

  // Chapter completion stats
  const chapterCompletedCount = activeChapter.lessons.filter((l) =>
    completedLessonIds.includes(l.id)
  ).length;
  const chapterTotalStars = activeChapter.lessons.reduce(
    (sum, l) => sum + (starsMap[l.id] || 0),
    0
  );
  const chapterMaxStars = activeChapter.lessons.length * 3;

  return (
    <div
      className="studio-panel academy-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'linear-gradient(145deg, #121824 0%, #0c0f16 100%)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Confetti Celebration Particles */}
      {confettiActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              padding: '1rem 2rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(16, 185, 129, 0.9)',
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: '800',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.8)',
              animation: 'bounce 0.5s ease',
            }}
          >
            🎉 AWESOME! CHORD MASTERED! ⭐⭐⭐
          </div>
        </div>
      )}

      {/* Academy Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
            }}
          >
            <GraduationCap size={18} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff' }}>
                Wavey Piano Academy
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                Strict Practice Mode
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Learn note letters, triads, and all 7th chords by playing them on your piano
            </div>
          </div>
        </div>

        {/* Global Progress & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#fde68a',
            }}
          >
            <Star size={15} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
            <span>
              {chapterCompletedCount}/{activeChapter.lessons.length} Done • {chapterTotalStars}/{chapterMaxStars} ★
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetProgress}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
            title="Reset academy progress"
          >
            <RotateCcw size={12} style={{ marginRight: '3px' }} />
            Reset
          </button>
        </div>
      </div>

      {/* Chapter Selector Tabs */}
      <div
        role="tablist"
        aria-label="Academy Chapters"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.65rem',
        }}
      >
        {ACADEMY_CHAPTERS.map((ch) => {
          const isSelected = ch.id === activeChapterId;
          const completedInCh = ch.lessons.filter((l) => completedLessonIds.includes(l.id)).length;
          const pct = Math.round((completedInCh / ch.lessons.length) * 100);

          return (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => selectChapter(ch.id)}
              style={{
                background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: isSelected ? '#fbbf24' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Chapter {ch.number} • {ch.badge}
                </span>

                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    color: completedInCh === ch.lessons.length ? '#34d399' : 'var(--text-muted)',
                    fontWeight: '600',
                  }}
                >
                  {completedInCh}/{ch.lessons.length} ({pct}%)
                </span>
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#ffffff' }}>
                {ch.title}
              </div>

              {/* Mini progress bar */}
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginTop: '2px',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: completedInCh === ch.lessons.length ? '#10b981' : '#f59e0b',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Lesson Navigation Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap', marginRight: '4px' }}>
          Lessons:
        </span>
        {activeChapter.lessons.map((lesson, idx) => {
          const isCurrent = idx === currentLessonIndex;
          const isPassed = completedLessonIds.includes(lesson.id);
          const stars = starsMap[lesson.id] || 0;

          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => selectLesson(idx)}
              style={{
                flex: '0 0 auto',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: isCurrent
                  ? '#f59e0b'
                  : isPassed
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(255, 255, 255, 0.04)',
                border: isCurrent
                  ? '1px solid #fde68a'
                  : isPassed
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid var(--border-subtle)',
                color: isCurrent ? '#000000' : isPassed ? '#34d399' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: isCurrent || isPassed ? '700' : '500',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>
                {idx + 1}. {lesson.targetSymbol || lesson.title.split(' ')[0]}
              </span>
              {stars > 0 && (
                <span style={{ fontSize: '0.65rem' }}>
                  {'★'.repeat(stars)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Challenge Card */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          position: 'relative',
        }}
      >
        {/* Challenge Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                Lesson {currentLessonIndex + 1} of {activeChapter.lessons.length}
              </span>
              {completedLessonIds.includes(currentLesson.id) && (
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                  <CheckCircle2 size={12} /> Mastered ({starsMap[currentLesson.id]} Stars)
                </span>
              )}
            </div>

            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
              {currentLesson.title}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {currentLesson.subtitle}
            </div>
          </div>

          {/* Action Audition & Hint Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onPlayTargetChord(currentLesson.targetMidiNotes)}
              style={{ padding: '0.35rem 0.75rem' }}
              title="Audition target notes through piano synthesizer"
            >
              <Volume2 size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Listen / Audition</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${isHintActive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setIsHintActive((h) => !h)}
              style={{
                padding: '0.35rem 0.75rem',
                borderColor: isHintActive ? '#f59e0b' : undefined,
                color: isHintActive ? '#ffffff' : '#fbbf24',
              }}
              title="Show target keys on the piano keyboard"
            >
              <HelpCircle size={14} />
              <span>{isHintActive ? 'Hide Hints' : 'Need a Hint?'}</span>
            </button>
          </div>
        </div>

        {/* Note Prompt & Live Validation Status */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: isSuccess ? '1px solid #10b981' : '1px solid var(--border-subtle)',
          }}
        >
          {/* Target Notes & Formula */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Target Required Notes (Hold all together):
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {currentLesson.noteNames.map((n, i) => {
                const targetPc = currentLesson.targetPitchClasses[i];
                const isCurrentlyPressed = activeNotes.some((an) => an.pitchClass === targetPc);

                return (
                  <div
                    key={n}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrentlyPressed
                        ? '#10b981'
                        : isSuccess
                        ? '#10b981'
                        : 'rgba(255, 255, 255, 0.08)',
                      color: isCurrentlyPressed || isSuccess ? '#ffffff' : 'var(--text-primary)',
                      border: isCurrentlyPressed ? '1px solid #34d399' : '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{n}</span>
                    {isCurrentlyPressed && <CheckCircle2 size={14} />}
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              {currentLesson.formulaText}
            </div>
          </div>

          {/* Sound Mood & Finger Guide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Sound Character & Touch:
            </div>

            <div style={{ fontSize: '0.88rem', color: '#f8fafc', fontWeight: '600' }}>
              🎵 {currentLesson.soundMood}
            </div>

            {currentLesson.fingerGuide && (
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                🖐️ {currentLesson.fingerGuide}
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
              🌊 {currentLesson.waveformInsight}
            </div>
          </div>
        </div>

        {/* Hint Box (when hint is revealed) */}
        {isHintActive && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              fontSize: '0.825rem',
              color: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <Sparkles size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>
              <strong>Key Guide:</strong> {currentLesson.hintExplanation} (Target keys are now highlighted in gold on the piano below).
            </span>
          </div>
        )}

        {/* Lesson Footer Navigation Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrevLesson}
            disabled={currentLessonIndex === 0}
          >
            <ArrowLeft size={14} />
            <span>Previous Lesson</span>
          </button>

          {isSuccess ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextLesson}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
              }}
            >
              <span>Next Lesson</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Hold down the target chord to complete the challenge
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleNextLesson}
            disabled={
              currentLessonIndex === activeChapter.lessons.length - 1 &&
              activeChapterId === 3
            }
          >
            <span>Skip / Next</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Chapter Completion Modal */}
      {showChapterModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setShowChapterModal(false)}
        >
          <div
            className="studio-panel"
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#121620',
              border: '2px solid #f59e0b',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(245, 158, 11, 0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '2rem 1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.5)',
              }}
            >
              <Award size={36} />
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff' }}>
              Chapter {activeChapter.number} Completed!
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              You have mastered <strong>{activeChapter.title}</strong>! You earned{' '}
              <strong style={{ color: '#fbbf24' }}>
                {chapterTotalStars} / {chapterMaxStars} Stars
              </strong>
              .
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowChapterModal(false)}
              >
                Review Lessons
              </button>
              {activeChapterId < 3 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowChapterModal(false);
                    selectChapter((activeChapterId + 1) as 1 | 2 | 3);
                  }}
                >
                  Start Chapter {activeChapterId + 1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
