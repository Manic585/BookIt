package com.bookingsystem.user.config;

import com.bookingsystem.user.domain.User;
import com.bookingsystem.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DefaultUserSeeder implements CommandLineRunner {

    private static final String DEFAULT_EMAIL = "customer@bookingsystem.com";
    private static final String DEFAULT_PASSWORD = "Customer@123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmail(DEFAULT_EMAIL)) {
            return;
        }

        User user = User.builder()
                .email(DEFAULT_EMAIL)
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .firstName("Default")
                .lastName("Customer")
                .role(User.Role.USER)
                .build();

        userRepository.save(user);
        log.info("Seeded default customer account: {}", DEFAULT_EMAIL);
    }
}
