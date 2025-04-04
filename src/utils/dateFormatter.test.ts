import { DateFormatter } from './dateFormatter';

describe('DateFormatter', () => {
  const testCases = [
    // Dates déjà en ISO8602
    {
      input: 'G+4500000000Y2',
      expected: {
        original: 'G+4500000000Y2',
        iso8602: 'G+4500000000Y2',
        geological: '4.50 Ga',
        french: '4.50 Ga',
        frenchTime: '4.50 Ga',
        years: '4500000000 ans',
        isISO8602: true
      }
    },
    {
      input: 'H-8000Y0',
      expected: {
        original: 'H-8000Y0',
        iso8602: 'H-8000Y0',
        geological: '8000 ans',
        french: '8000 ans',
        frenchTime: '8000 ans',
        years: '-8000 ans',
        isISO8602: true
      }
    },
    // Dates à convertir
    {
      input: '4.5 Ga',
      expected: {
        original: '4.5 Ga',
        iso8602: 'G+4500000000Y2',
        geological: '4.50 Ga',
        french: '4.50 Ga',
        frenchTime: '4.50 Ga',
        years: '4500000000 ans',
        isISO8602: false
      }
    },
    {
      input: '04/04/2025',
      expected: {
        original: '04/04/2025',
        iso8602: 'M+2025Y4',
        geological: '2025 ans',
        french: '04/04/2025',
        frenchTime: '04/04/2025 - 15:30',
        years: '2025 ans',
        isISO8602: false
      }
    },
    {
      input: '-8000BCE',
      expected: {
        original: '-8000BCE',
        iso8602: 'H-8000Y0',
        geological: '8000 ans',
        french: '8000 ans',
        frenchTime: '8000 ans',
        years: '-8000 ans',
        isISO8602: false
      }
    },
    {
      input: '8. millennium BCE',
      expected: {
        original: '8. millennium BCE',
        iso8602: 'H-8000Y1',
        geological: '8000 ans',
        french: '8000 ans',
        frenchTime: '8000 ans',
        years: '-8000 ans',
        isISO8602: false
      }
    }
  ];

  testCases.forEach(({ input, expected }) => {
    it(`should process date: ${input}`, () => {
      const result = DateFormatter.processDate(input);
      expect(result).toEqual(expected);
    });
  });
}); 