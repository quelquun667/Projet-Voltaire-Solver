# Changelog

## [1.1.0] - 2025-11-27

### ✨ Added
- **AI Integration**: Added Google Gemini 1.5 Flash integration for intelligent auto-solving.
- **Random Delay**: Implemented configurable min/max delay to simulate human behavior.
- **"No Mistake" Handling**: Improved detection and clicking of the "Il n'y a pas de faute" button, including handling of instruction text.
- **API Key Configuration**: Added UI to input and save the Gemini API key.

### 🐛 Fixed
- **Button Conflict**: Resolved issue where the extension clicked instruction text instead of the "No Mistake" button.
- **Click Event**: Implemented robust click simulation (mousedown/mouseup/click) for better compatibility.
- **Encoding**: Fixed character encoding issues in the popup.

### 🔧 Changed
- **UI**: Renamed "Master" toggle for clarity.
- **Manifest**: Updated permissions to allow communication with Gemini API.