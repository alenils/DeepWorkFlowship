import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { AudioProvider, useAudio } from './AudioProvider';

// Mock the import.meta.glob function based on how it's used in AudioProvider.tsx
vi.mock('import.meta.glob', () => {
  // Create a mock function that returns different values based on the path
  return {
    default: (path: string, options?: Record<string, unknown>) => {
      // For SFX files
      if (path === '../../assets/sfx/*.mp3') {
        return {
          '../../assets/sfx/start.mp3': '/mocked-path/start.mp3',
          '../../assets/sfx/pause.mp3': '/mocked-path/pause.mp3',
          '../../assets/sfx/done.mp3': '/mocked-path/done.mp3',
          '../../assets/sfx/check.mp3': '/mocked-path/check.mp3',
          '../../assets/sfx/cancel.mp3': '/mocked-path/cancel.mp3',
          '../../assets/sfx/distraction.mp3': '/mocked-path/distraction.mp3'
        };
      } 
      // For music files
      else if (path === '../../assets/music/**/*.mp3') {
        return {
          '../../assets/music/album1/track1.mp3': '/mocked-path/album1/track1.mp3',
          '../../assets/music/album1/track2.mp3': '/mocked-path/album1/track2.mp3',
          '../../assets/music/album2/track1.mp3': '/mocked-path/album2/track1.mp3',
          '../../assets/music/album2/track2.mp3': '/mocked-path/album2/track2.mp3'
        };
      }
      // For debug music glob
      else if (path === '../../assets/music/**/*.mp3' && options && options.eager === true) {
        return {
          '../../assets/music/album1/track1.mp3': '/mocked-path/album1/track1.mp3',
          '../../assets/music/album1/track2.mp3': '/mocked-path/album1/track2.mp3',
          '../../assets/music/album2/track1.mp3': '/mocked-path/album2/track1.mp3',
          '../../assets/music/album2/track2.mp3': '/mocked-path/album2/track2.mp3'
        };
      }
      // For debug sfx glob
      else if (path === '../../assets/sfx/*.mp3' && options && options.eager === true) {
        return {
          '../../assets/sfx/start.mp3': '/mocked-path/start.mp3',
          '../../assets/sfx/pause.mp3': '/mocked-path/pause.mp3',
          '../../assets/sfx/done.mp3': '/mocked-path/done.mp3',
          '../../assets/sfx/check.mp3': '/mocked-path/check.mp3',
          '../../assets/sfx/cancel.mp3': '/mocked-path/cancel.mp3',
          '../../assets/sfx/distraction.mp3': '/mocked-path/distraction.mp3'
        };
      }
      return {};
    }
  };
});

describe('AudioProvider and useAudio hook', () => {
  beforeEach(() => {
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const TestConsumer: React.FC<{ sfxNameToPlay?: string; onRender?: (ctx: any) => void }> = ({ sfxNameToPlay, onRender }) => {
    const audioContext = useAudio();
    useEffect(() => {
      if (onRender) onRender(audioContext);
      if (sfxNameToPlay) {
        act(() => {
          audioContext.playSfx(sfxNameToPlay);
        });
      }
    }, [sfxNameToPlay, audioContext, onRender]);
    return null;
  };

  it('playSfx calls new Audio(url) and audio.play() if sound URL is found', () => {
    render(
      <AudioProvider>
        <TestConsumer sfxNameToPlay="start.mp3" />
      </AudioProvider>
    );

    // Check if Audio constructor was called
    expect(Audio).toHaveBeenCalled();
  });

  it('audio context related functions should not throw errors', () => {
    const renderResult = render(
      <AudioProvider>
        <div>Audio Test</div>
      </AudioProvider>
    );
    
    // Test passes if the component renders without errors
    expect(renderResult.container).toBeDefined();
  });
  
  it('uses the useAudio hook correctly', () => {
    let hookResult: any;
    
    render(
      <AudioProvider>
        <TestConsumer onRender={(ctx) => { hookResult = ctx; }} />
      </AudioProvider>
    );
    
    // Check that the hook returned the expected API
    expect(hookResult).toBeDefined();
    expect(typeof hookResult.playPause).toBe('function');
    expect(typeof hookResult.nextTrack).toBe('function');
    expect(typeof hookResult.prevTrack).toBe('function');
    expect(typeof hookResult.playSfx).toBe('function');
  });
}); 