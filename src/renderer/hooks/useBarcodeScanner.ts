import { useEffect, useRef } from 'react';

/**
 * Global hook to listen for hardware barcode scanner input.
 * Hardware scanners emulate rapid keyboard typing followed by an 'Enter' key.
 *
 * @param onScan Callback triggered when a barcode is successfully scanned
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const buffer = useRef('');
  const lastKeyTime = useRef<number>(0);
  
  // Define maximum time (ms) between keystrokes to be considered a scanner.
  // Human typing is typically > 100ms per character.
  // Hardware scanners are typically < 30ms.
  const SCANNER_TIMEOUT_MS = 50;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTime.current;

      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      // If time since last keypress is too long, it's likely manual typing.
      // Reset the buffer.
      if (timeDiff > SCANNER_TIMEOUT_MS && buffer.current.length > 0) {
        buffer.current = '';
      }

      if (e.key === 'Enter') {
        // If we have accumulated characters quickly, it's a scanner read
        if (buffer.current.length >= 3) { // Arbitrary minimum length for a valid barcode
          // Stop the Enter key from triggering default behaviors (e.g., submitting a focused input)
          e.preventDefault();
          e.stopPropagation();
          
          const scannedCode = buffer.current;
          buffer.current = '';
          
          // Execute callback
          onScan(scannedCode);
        } else {
          // Manual Enter press, clear buffer just in case
          buffer.current = '';
        }
      } else {
        // Accumulate visible characters
        if (e.key.length === 1) {
          buffer.current += e.key;
        } else {
          // Non-character keys (e.g. Backspace, Arrow keys) disrupt the scan
          buffer.current = '';
        }
      }

      lastKeyTime.current = currentTime;
    };

    // Use capturing phase to intercept the event before it reaches focused elements
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan]);
}
