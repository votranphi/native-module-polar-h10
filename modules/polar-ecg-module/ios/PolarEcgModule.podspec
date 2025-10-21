Pod::Spec.new do |s|
  s.name           = 'PolarEcgModule'
  s.version        = '1.0.0'
  s.summary        = 'Polar ECG Module'
  s.description    = 'Module for streaming ECG data from Polar H10'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '13.4', :tvos => '13.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'PolarBleSdk', '~> 5.4.0'

  s.pod_target_xcconfig = {
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end