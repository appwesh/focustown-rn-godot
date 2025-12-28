const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Fixes compatibility between Firebase (static frameworks) and react-native-godot.
 * 
 * The issue: react-native-godot includes <react-native-worklets-core/WKTJsiWorklet.h>
 * but headers are nested in subdirectories (base/, wrappers/, etc.) while includes
 * expect a flat structure.
 * 
 * Solution: Flatten all .h files into a single directory structure.
 */

function getAllHeaderFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllHeaderFiles(fullPath, files);
    } else if (item.endsWith(".h")) {
      files.push(fullPath);
    }
  }
  return files;
}

module.exports = function withFirebaseGodotFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const nodeModulesPath = path.join(projectRoot, "node_modules");
      const workletsCoreDir = path.join(nodeModulesPath, "react-native-worklets-core", "cpp");
      
      // Create a flat headers directory
      const headersDir = path.join(projectRoot, "ios", ".generated-headers");
      const flatHeadersDir = path.join(headersDir, "react-native-worklets-core");
      
      try {
        // Clean and recreate
        if (fs.existsSync(flatHeadersDir)) {
          fs.rmSync(flatHeadersDir, { recursive: true });
        }
        fs.mkdirSync(flatHeadersDir, { recursive: true });
        
        // Get all header files from worklets-core/cpp (including subdirs)
        const headerFiles = getAllHeaderFiles(workletsCoreDir);
        
        // Create symlinks for each header in the flat directory
        for (const headerPath of headerFiles) {
          const fileName = path.basename(headerPath);
          const symlinkPath = path.join(flatHeadersDir, fileName);
          
          // Skip if already exists
          if (!fs.existsSync(symlinkPath)) {
            fs.symlinkSync(headerPath, symlinkPath, "file");
          }
        }
        
        console.log(`[Firebase+Godot Fix] Created ${headerFiles.length} header symlinks`);
      } catch (e) {
        console.warn("[Firebase+Godot Fix] Could not create symlinks:", e.message);
      }

      // Update the Podfile
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf-8");
      
      // Add RNFirebase static framework flag at the top of the Podfile
      if (!podfile.includes("$RNFirebaseAsStaticFramework")) {
        podfile = podfile.replace(
          /require File\.join\(File\.dirname\(`node/,
          "$RNFirebaseAsStaticFramework = true\n\nrequire File.join(File.dirname(`node"
        );
      }

      const postInstallCode = `
    # Firebase + Godot compatibility fix
    headers_dir = File.join(__dir__, '.generated-headers')
    worklets_headers = File.join(headers_dir, 'react-native-worklets-core')
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        # Allow non-modular includes for ALL pods (fixes Firebase + static frameworks)
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        
        # Disable strict module verification for Firebase compatibility
        build_config.build_settings['CLANG_WARN_STRICT_PROTOTYPES'] = 'NO'
        build_config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
        
        # Fix Godot header search paths
        if target.name == 'borndotcom-react-native-godot'
          existing_paths = build_config.build_settings['HEADER_SEARCH_PATHS'] || ['$(inherited)']
          existing_paths = [existing_paths] if existing_paths.is_a?(String)
          existing_paths << headers_dir
          existing_paths << worklets_headers
          build_config.build_settings['HEADER_SEARCH_PATHS'] = existing_paths
        end
      end
    end
`;

      // Check if there's already a post_install block
      if (podfile.includes("post_install do |installer|")) {
        if (!podfile.includes("Firebase + Godot compatibility fix")) {
          podfile = podfile.replace(
            /post_install do \|installer\|\n/,
            "post_install do |installer|\n" + postInstallCode
          );
        }
      } else {
        podfile += "\n  post_install do |installer|\n" + postInstallCode + "\n  end\n";
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

