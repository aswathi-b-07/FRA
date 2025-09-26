# Face Detection Debugging Guide

This guide explains how to use the comprehensive debugging tools to troubleshoot face detection issues.

## Quick Start

1. **Enable Debug Mode**:
```jsx
import EnhancedFaceCapture from '../components/EnhancedFaceCapture'

<EnhancedFaceCapture
  enableDebug={true}  // Add this prop
  onCapture={handleCapture}
  onError={handleError}
/>
```

2. **Open Debug Panel**: Click the "🐛 Debug" button during face capture

3. **Check Console**: Open browser developer tools to see detailed logs

## Debug Features

### 1. Visual Debug Overlay
- **Location**: Top-right corner of the screen during capture
- **Shows**: Real-time FPS, processing time, face count, quality scores
- **Colors**: 
  - Green bars = Good performance
  - Red bars = Performance issues

### 2. Debug Panel
- **System Diagnostics**: Check if all components are working
- **Performance Stats**: Real-time performance metrics
- **Live Logs**: Detailed logging with filtering
- **Error Tracking**: Recent errors and their details

### 3. Console Logging
All debug information is also logged to the browser console with timestamps and context.

## Troubleshooting Common Issues

### Issue: "OpenCV.js not loaded"
**Symptoms**: 
- Debug panel shows "OpenCV Loaded: ❌"
- Console error about OpenCV

**Solutions**:
1. Check internet connection
2. Verify OpenCV.js CDN is accessible
3. Try refreshing the page
4. Check browser console for network errors

### Issue: "Camera access denied"
**Symptoms**:
- Debug panel shows "Camera Accessible: ❌"
- Video stream doesn't start

**Solutions**:
1. Check browser camera permissions
2. Try different browser
3. Ensure HTTPS (required for camera access)
4. Check if camera is being used by another application

### Issue: "No faces detected"
**Symptoms**:
- Debug panel shows "Detection Rate: 0%"
- No face rectangles appear

**Solutions**:
1. Improve lighting conditions
2. Position face clearly in camera view
3. Check if Haar cascade loaded successfully
4. Verify face is facing camera directly

### Issue: "Poor quality scores"
**Symptoms**:
- Quality scores consistently below 70%
- Auto-capture not triggering

**Solutions**:
1. Improve lighting (avoid backlighting)
2. Move closer to camera
3. Ensure face is in focus
4. Avoid motion blur (stay still)

### Issue: "High processing times"
**Symptoms**:
- Debug panel shows processing times > 50ms
- Low FPS (< 15)

**Solutions**:
1. Close other browser tabs
2. Check system resources
3. Try lower video resolution
4. Disable other extensions

### Issue: "Embedding extraction fails"
**Symptoms**:
- Face detected but embedding extraction fails
- Console errors about face-api.js

**Solutions**:
1. Ensure face-api.js models are loaded
2. Check network connectivity to model files
3. Verify face region is valid
4. Try capturing again with better quality

## Debug Data Export

You can export debug data for analysis:

1. Open Debug Panel
2. Click "Export Data" button
3. Save the JSON file
4. Share with developers for analysis

The exported data includes:
- All log entries
- Performance statistics
- Error details
- System diagnostics

## Performance Monitoring

### Key Metrics to Watch:
- **FPS**: Should be > 15 for smooth operation
- **Processing Time**: Should be < 50ms per frame
- **Detection Rate**: Should be > 50% when face is visible
- **Quality Score**: Should be > 70% for good captures

### Performance Optimization:
- Close unnecessary browser tabs
- Use good lighting
- Ensure stable camera position
- Keep face centered and still

## Debug API Usage

### Manual Debug Control:
```javascript
import faceDetectionDebugger from '../utils/faceDetectionDebugger'

// Enable debugging
faceDetectionDebugger.enable({
  logLevel: 'debug',
  showVisualDebug: true,
  logToConsole: true,
  trackPerformance: true
})

// Run diagnostics
const diagnostics = await faceDetectionDebugger.runDiagnostics()

// Get debug report
const report = faceDetectionDebugger.getDebugReport()

// Export debug data
const data = faceDetectionDebugger.exportDebugData()

// Disable debugging
faceDetectionDebugger.disable()
```

### Custom Logging:
```javascript
// Log custom debug information
faceDetectionDebugger.log('info', 'Custom debug message', { 
  customData: 'value' 
})

// Log performance warnings
faceDetectionDebugger.logPerformanceWarning('Custom warning', {
  metric: 'value'
})
```

## Integration with Existing Code

### Update Your OpenCV Loop:
```javascript
import faceDetectionDebugger from './faceDetectionDebugger'

// In your existing processVideo function:
function processVideo() {
  try {
    if (!streaming) {
      // Log stopping
      faceDetectionDebugger.log('info', 'Video processing stopped')
      return
    }
    
    const begin = performance.now()
    faceDetectionDebugger.logFrameStart(frameCount)
    
    // Your existing detection code...
    classifier.detectMultiScale(gray, faces, 1.1, 3, 0)
    
    const processingTime = performance.now() - begin
    const detectedFaces = [] // Your face processing
    
    // Log results
    faceDetectionDebugger.logDetectionResult(
      detectedFaces, 
      processingTime, 
      { width: video.width, height: video.height }
    )
    
    // Continue with your existing code...
  } catch (err) {
    faceDetectionDebugger.log('error', 'Processing error', err)
  }
}
```

## Best Practices

1. **Enable debugging during development** but disable in production
2. **Monitor performance metrics** to catch issues early
3. **Export debug data** when reporting issues
4. **Use appropriate log levels** (debug for development, error for production)
5. **Check diagnostics first** when troubleshooting
6. **Clear debug data periodically** to prevent memory issues

## Support

When reporting face detection issues, please:

1. Enable debug mode
2. Reproduce the issue
3. Export debug data
4. Include browser and OS information
5. Describe expected vs actual behavior

The debug data will help developers quickly identify and fix issues.
