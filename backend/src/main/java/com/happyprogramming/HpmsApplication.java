package com.happyprogramming;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HpmsApplication {
    public static void main(String[] args) {
        SpringApplication.run(HpmsApplication.class, args);
        System.out.println("\n==========================================================");
        System.out.println(">> HappyProgramming: http://localhost:5173");
        System.out.println("==========================================================\n");
    }
}
