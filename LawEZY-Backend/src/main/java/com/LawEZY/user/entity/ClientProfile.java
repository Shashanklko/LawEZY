package com.LawEZY.user.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "client_profiles")
public class ClientProfile extends BaseProfile {

    private String address;
    private Double walletBalance = 0.0;

    public ClientProfile() {}

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public Double getWalletBalance() { return walletBalance; }
    public void setWalletBalance(Double walletBalance) { this.walletBalance = walletBalance; }
}
