package com.LawEZY.config.security;

import com.LawEZY.auth.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration 
@EnableWebSecurity // Turns on Spring Security for the whole application
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity // Enable @PreAuthorize
public class SecurityConfig {

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins:http://localhost:5173,https://lawezy.onrender.com,https://lawezy-sigma.vercel.app}")
    private String allowedOrigins;

    // The Password scrambler we made in Step 2!
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Tells Spring to check username/passwords against our CustomUserDetailsService (Database)
    // instead of an in-memory dictionary.
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    // Exposes the AuthenticationManager so we can manually trigger logins in Step 6
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable) // Disable CSRF since we are using JWT tokens
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()         // ALLOW anyone to hit login/register
                .requestMatchers("/api/professionals/**").permitAll() // ALLOW access to professional listings
                .requestMatchers("/api/system/mode").permitAll()     // ALLOW system mode check (used by MainLayout on load)
                .requestMatchers("/api/ai/copilot").authenticated()  // AI intelligence requires valid account
                .requestMatchers("/api/ai/document/**").authenticated() // Analysis requires authentication
                .requestMatchers("/ws/**").permitAll()               // ALLOW WebSocket handshake
                // 🔐 ADMIN GOVERNANCE: Strictly enforce ROLE_ADMIN or ROLE_MASTER_ADMIN for all command-center endpoints
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "MASTER_ADMIN")
                // 🛡️ RESOURCE PROTECTION: Any authenticated user can publish; only Admins can delete
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/resources/**").hasRole("ADMIN")
                .anyRequest().authenticated()                        // Block ALL other endpoints without a valid JWT
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // We don't want Spring to remember sessions; JWT handles that
            )
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .headers(headers -> headers
                .frameOptions(org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.FrameOptionsConfig::sameOrigin)
            )
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new org.springframework.security.web.authentication.HttpStatusEntryPoint(org.springframework.http.HttpStatus.UNAUTHORIZED))
            );

        // Put our Bouncer (JwtRequestFilter) right in front of the door (the default UsernamePasswordAuthenticationFilter)
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        // Attach our custom DB lookup provider
        http.authenticationProvider(authenticationProvider());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
