/**
 * Progressive Disclosure Test Server - 3 Distinct Skills
 *
 * This server is designed to test LLM behavior with progressive disclosure.
 * It provides 3 skills in completely different domains:
 * - Weather Analysis (meteorology)
 * - File Management (filesystem)
 * - Math Calculations (arithmetic)
 *
 * The LLM should:
 * 1. See 3 skill descriptions in resources/list
 * 2. Choose the correct skill based ONLY on the description
 * 3. Read ONLY the chosen skill (not all 3)
 * 4. Use only the tools/resources from that skill
 * 5. Successfully complete the task
 *
 * All tools and resources are hidden to test progressive disclosure.
 *
 * Usage:
 * ```bash
 * # Build the project first
 * npm run build
 *
 * # Test with Claude CLI
 * cat > /tmp/test-pd-config.json << 'EOF'
 * {
 *   "mcpServers": {
 *     "pd-test": {
 *       "command": "node",
 *       "args": ["dist/src/cli/index.js", "run", "examples/progressive-disclosure-test-server.ts"]
 *     }
 *   }
 * }
 * EOF
 *
 * # Test 1: Weather Query (should choose weather_analysis skill)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-pd-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "What's the weather forecast for tomorrow in San Francisco?"
 *
 * # Test 2: File Operation (should choose file_management skill)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-pd-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "List all files in my documents folder"
 *
 * # Test 3: Math Problem (should choose math_calculations skill)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-pd-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "Calculate the average of these numbers: 10, 20, 30, 40, 50"
 *
 * # Discovery Test (see all skills)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-pd-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "List all available resources"
 * ```
 */

import {
  ITool,
  IResource,
  ISkill,
  IParam,
  ToolHelper,
  ResourceHelper,
  SkillHelper,
} from '../src/index.js';

// ============================================================================
// SKILL 1: WEATHER ANALYSIS (Meteorology Domain)
// ============================================================================

interface WeatherAnalysisSkill extends ISkill {
  name: 'weather_analysis';
  description: 'Analyze weather patterns and provide forecasts';
  tools: ['get_weather', 'get_forecast', 'analyze_climate'];
  resources: ['weather://current', 'weather://historical'];
  sampling: { intelligencePriority: 4 }; // Sonnet for weather analysis
}

// Weather Tool Parameters
interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
}

interface RegionParam extends IParam {
  type: 'string';
  description: 'Region name';
}

interface DaysParam extends IParam {
  type: 'number';
  description: 'Number of days for forecast (1-7)';
}

interface TimePeriodParam extends IParam {
  type: 'string';
  description: 'Time period for climate analysis';
}

// Weather Tools (all hidden)
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather conditions for a location';
  params: { city: CityParam };
  result: { temperature: number; conditions: string; humidity: number; wind_speed: number };
  hidden: true;
  skill: 'weather_analysis';
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast for the next 7 days';
  params: { city: CityParam; days?: DaysParam };
  result: { forecast: Array<{ date: string; temperature: number; conditions: string }> };
  hidden: true;
  skill: 'weather_analysis';
}

interface AnalyzeClimateTool extends ITool {
  name: 'analyze_climate';
  description: 'Analyze climate patterns and trends';
  params: { region: RegionParam; time_period?: TimePeriodParam };
  result: { average_temp: number; rainfall: number; trends: string[] };
  hidden: true;
  skill: 'weather_analysis';
}

// Weather Resources (all hidden)
interface CurrentWeatherResource extends IResource {
  uri: 'weather://current';
  name: 'Current Weather Data';
  description: 'Real-time weather data from global stations';
  mimeType: 'application/json';
  returns: { stations: number; last_update: string };
  hidden: true;
  skill: 'weather_analysis';
}

interface HistoricalWeatherResource extends IResource {
  uri: 'weather://historical';
  name: 'Historical Weather Data';
  description: 'Historical weather records and trends';
  mimeType: 'application/json';
  returns: { records: number; date_range: string };
  hidden: true;
  skill: 'weather_analysis';
}

// ============================================================================
// SKILL 2: FILE MANAGEMENT (Filesystem Domain)
// ============================================================================

interface FileManagementSkill extends ISkill {
  name: 'file_management';
  description: 'Manage files and directories on the system';
  tools: ['list_files', 'read_file', 'write_file', 'delete_file'];
  resources: ['fs://home', 'fs://documents'];
  sampling: { intelligencePriority: 3 }; // Haiku for simple file operations
}

// File Tool Parameters
interface PathParam extends IParam {
  type: 'string';
  description: 'File or directory path';
}

interface RecursiveParam extends IParam {
  type: 'boolean';
  description: 'Whether to operate recursively';
}

interface ContentParam extends IParam {
  type: 'string';
  description: 'File content to write';
}

// File Tools (all hidden)
interface ListFilesTool extends ITool {
  name: 'list_files';
  description: 'List files and directories in a path';
  params: { path: PathParam; recursive?: RecursiveParam };
  result: { files: Array<{ name: string; type: 'file' | 'directory'; size: number }> };
  hidden: true;
  skill: 'file_management';
}

interface ReadFileTool extends ITool {
  name: 'read_file';
  description: 'Read the contents of a file';
  params: { path: PathParam };
  result: { content: string; size: number; mime_type: string };
  hidden: true;
  skill: 'file_management';
}

interface WriteFileTool extends ITool {
  name: 'write_file';
  description: 'Write content to a file';
  params: { path: PathParam; content: ContentParam };
  result: { success: boolean; bytes_written: number };
  hidden: true;
  skill: 'file_management';
}

interface DeleteFileTool extends ITool {
  name: 'delete_file';
  description: 'Delete a file or directory';
  params: { path: PathParam; recursive?: RecursiveParam };
  result: { success: boolean; items_deleted: number };
  hidden: true;
  skill: 'file_management';
}

// File Resources (all hidden)
interface HomeDirectoryResource extends IResource {
  uri: 'fs://home';
  name: 'Home Directory';
  description: 'User home directory structure and contents';
  mimeType: 'application/json';
  returns: { path: string; total_size: number; file_count: number };
  hidden: true;
  skill: 'file_management';
}

interface DocumentsResource extends IResource {
  uri: 'fs://documents';
  name: 'Documents Directory';
  description: 'Documents folder listing';
  mimeType: 'application/json';
  returns: { path: string; documents: string[] };
  hidden: true;
  skill: 'file_management';
}

// ============================================================================
// SKILL 3: MATH CALCULATIONS (Arithmetic Domain)
// ============================================================================

interface MathCalculationsSkill extends ISkill {
  name: 'math_calculations';
  description: 'Perform mathematical calculations and analysis';
  tools: ['add', 'subtract', 'multiply', 'divide', 'calculate_stats'];
  resources: ['math://constants', 'math://formulas'];
  sampling: { intelligencePriority: 2 }; // Haiku for simple math
}

// Math Tool Parameters
interface NumbersParam extends IParam {
  type: 'array';
  description: 'Array of numbers to operate on';
}

// Math Tools (all hidden)
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two or more numbers';
  params: { numbers: NumbersParam };
  result: { result: number };
  hidden: true;
  skill: 'math_calculations';
}

interface SubtractTool extends ITool {
  name: 'subtract';
  description: 'Subtract numbers sequentially';
  params: { numbers: NumbersParam };
  result: { result: number };
  hidden: true;
  skill: 'math_calculations';
}

interface MultiplyTool extends ITool {
  name: 'multiply';
  description: 'Multiply two or more numbers';
  params: { numbers: NumbersParam };
  result: { result: number };
  hidden: true;
  skill: 'math_calculations';
}

interface DivideTool extends ITool {
  name: 'divide';
  description: 'Divide numbers sequentially';
  params: { numbers: NumbersParam };
  result: { result: number };
  hidden: true;
  skill: 'math_calculations';
}

interface CalculateStatsTool extends ITool {
  name: 'calculate_stats';
  description: 'Calculate statistical measures (mean, median, mode, std dev)';
  params: { numbers: NumbersParam };
  result: { mean: number; median: number; mode: number[]; std_dev: number; sum: number; count: number };
  hidden: true;
  skill: 'math_calculations';
}

// Math Resources (all hidden)
interface MathConstantsResource extends IResource {
  uri: 'math://constants';
  name: 'Mathematical Constants';
  description: 'Common mathematical constants (pi, e, phi, etc)';
  mimeType: 'application/json';
  returns: { pi: number; e: number; phi: number; sqrt2: number };
  hidden: true;
  skill: 'math_calculations';
}

interface MathFormulasResource extends IResource {
  uri: 'math://formulas';
  name: 'Mathematical Formulas';
  description: 'Common mathematical formulas and equations';
  mimeType: 'application/json';
  returns: { formulas: string[] };
  hidden: true;
  skill: 'math_calculations';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

export default class ProgressiveDisclosureTestServer {
  // SKILL IMPLEMENTATIONS (Visible - Gateway to Hidden Capabilities)

  weatherAnalysis: SkillHelper<WeatherAnalysisSkill> = () => ''; // Auto-generated

  fileManagement: SkillHelper<FileManagementSkill> = () => ''; // Auto-generated

  mathCalculations: SkillHelper<MathCalculationsSkill> = () => ''; // Auto-generated

  // WEATHER TOOLS IMPLEMENTATION

  getWeather: ToolHelper<GetWeatherTool> = async ({ city }) => {
    // Mock weather data
    const temperature = Math.round(15 + Math.random() * 15);
    const conditions = ['sunny', 'cloudy', 'partly cloudy', 'rainy', 'windy'][Math.floor(Math.random() * 5)];

    return {
      temperature,
      conditions,
      humidity: Math.round(40 + Math.random() * 40),
      wind_speed: Math.round(5 + Math.random() * 20),
    };
  };

  getForecast: ToolHelper<GetForecastTool> = async ({ city, days = 7 }) => {
    const forecast = [];
    const today = new Date();

    for (let i = 1; i <= Math.min(days, 7); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      forecast.push({
        date: date.toISOString().split('T')[0],
        temperature: Math.round(15 + Math.random() * 15),
        conditions: ['sunny', 'cloudy', 'partly cloudy', 'rainy'][Math.floor(Math.random() * 4)],
      });
    }

    return { forecast };
  };

  analyzeClimate: ToolHelper<AnalyzeClimateTool> = async ({ region, time_period = '10 years' }) => {
    return {
      average_temp: Math.round(15 + Math.random() * 10),
      rainfall: Math.round(500 + Math.random() * 1000),
      trends: [
        'Temperature increasing by 0.2°C per decade',
        'Rainfall patterns becoming more variable',
        'Extreme weather events increasing in frequency',
      ],
    };
  };

  // WEATHER RESOURCES IMPLEMENTATION

  'weather://current': ResourceHelper<CurrentWeatherResource> = async () => ({
    stations: 10000,
    last_update: new Date().toISOString(),
  });

  'weather://historical': ResourceHelper<HistoricalWeatherResource> = async () => ({
    records: 5000000,
    date_range: '1900-present',
  });

  // FILE TOOLS IMPLEMENTATION

  listFiles: ToolHelper<ListFilesTool> = async ({ path, recursive = false }) => {
    // Mock file listing
    const mockFiles = [
      { name: 'document1.txt', type: 'file' as const, size: 1024 },
      { name: 'document2.pdf', type: 'file' as const, size: 2048 },
      { name: 'reports', type: 'directory' as const, size: 0 },
      { name: 'notes.md', type: 'file' as const, size: 512 },
      { name: 'data.json', type: 'file' as const, size: 4096 },
    ];

    return { files: mockFiles };
  };

  readFile: ToolHelper<ReadFileTool> = async ({ path }) => {
    // Mock file reading
    return {
      content: `This is the content of ${path}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      size: 128,
      mime_type: 'text/plain',
    };
  };

  writeFile: ToolHelper<WriteFileTool> = async ({ path, content }) => {
    // Mock file writing
    return {
      success: true,
      bytes_written: content.length,
    };
  };

  deleteFile: ToolHelper<DeleteFileTool> = async ({ path, recursive = false }) => {
    // Mock file deletion
    return {
      success: true,
      items_deleted: recursive ? 5 : 1,
    };
  };

  // FILE RESOURCES IMPLEMENTATION

  'fs://home': ResourceHelper<HomeDirectoryResource> = async () => ({
    path: '/home/user',
    total_size: 1024 * 1024 * 1024, // 1GB
    file_count: 1234,
  });

  'fs://documents': ResourceHelper<DocumentsResource> = async () => ({
    path: '/home/user/documents',
    documents: [
      'proposal.docx',
      'budget.xlsx',
      'presentation.pptx',
      'report.pdf',
      'notes.txt',
    ],
  });

  // MATH TOOLS IMPLEMENTATION

  add: ToolHelper<AddTool> = async ({ numbers }) => {
    const result = numbers.reduce((sum, num) => sum + num, 0);
    return { result };
  };

  subtract: ToolHelper<SubtractTool> = async ({ numbers }) => {
    if (numbers.length === 0) return { result: 0 };
    const result = numbers.reduce((diff, num, index) =>
      index === 0 ? num : diff - num
    );
    return { result };
  };

  multiply: ToolHelper<MultiplyTool> = async ({ numbers }) => {
    const result = numbers.reduce((product, num) => product * num, 1);
    return { result };
  };

  divide: ToolHelper<DivideTool> = async ({ numbers }) => {
    if (numbers.length === 0) return { result: 0 };
    if (numbers.slice(1).some(n => n === 0)) {
      throw new Error('Division by zero');
    }
    const result = numbers.reduce((quotient, num, index) =>
      index === 0 ? num : quotient / num
    );
    return { result };
  };

  calculateStats: ToolHelper<CalculateStatsTool> = async ({ numbers }) => {
    if (numbers.length === 0) {
      return {
        mean: 0,
        median: 0,
        mode: [],
        std_dev: 0,
        sum: 0,
        count: 0,
      };
    }

    // Calculate mean
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    const mean = sum / numbers.length;

    // Calculate median
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    // Calculate mode
    const frequency: Record<number, number> = {};
    let maxFreq = 0;

    numbers.forEach(num => {
      frequency[num] = (frequency[num] || 0) + 1;
      if (frequency[num] > maxFreq) {
        maxFreq = frequency[num];
      }
    });

    const mode = Object.keys(frequency)
      .filter(key => frequency[Number(key)] === maxFreq)
      .map(Number);

    // Calculate standard deviation
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / numbers.length;
    const std_dev = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      mode,
      std_dev: Math.round(std_dev * 100) / 100,
      sum,
      count: numbers.length,
    };
  };

  // MATH RESOURCES IMPLEMENTATION

  'math://constants': ResourceHelper<MathConstantsResource> = async () => ({
    pi: 3.141592653589793,
    e: 2.718281828459045,
    phi: 1.618033988749895,
    sqrt2: 1.4142135623730951,
  });

  'math://formulas': ResourceHelper<MathFormulasResource> = async () => ({
    formulas: [
      'Area of circle: A = πr²',
      'Pythagorean theorem: a² + b² = c²',
      'Quadratic formula: x = (-b ± √(b²-4ac)) / 2a',
      'Standard deviation: σ = √(Σ(x-μ)²/N)',
      'Distance formula: d = √((x₂-x₁)² + (y₂-y₁)²)',
    ],
  });
}
