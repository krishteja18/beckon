Pod::Spec.new do |s|
  s.name           = 'ShowupAlarm'
  s.version        = '0.1.0'
  s.summary        = 'CallKit + PushKit exact background calls handler for Showup.'
  s.description    = 'CallKit + PushKit exact background calls handler for Showup.'
  s.author         = 'showup'
  s.homepage       = 'https://github.com/krishnateja_777/showup'
  s.platform       = :ios, '13.0'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILER_FLAGS' => '-no-warnings'
  }

  s.source_files = "**/*.{h,m,swift}"
end
